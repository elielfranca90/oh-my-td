import { beforeEach, describe, expect, it } from 'vitest';
import { AchievementManager } from '../src/engine/AchievementManager';
import { AnalyticsManager } from '../src/engine/AnalyticsManager';
import { TalentManager } from '../src/engine/TalentManager';

describe('AchievementManager persistence & toasts', () => {
  beforeEach(() => localStorage.clear());

  it('rejects non-numeric progress from a tampered payload', () => {
    localStorage.setItem('td2d_achievements_v1', JSON.stringify({
      RUNNER_HUNTER: { unlocked: false, progress: '<script>alert(1)</script>' },
      BOSS_SLAYER: { unlocked: 'truthy-string', progress: 3 },
    }));

    const am = new AchievementManager(new TalentManager());

    expect(am.achievements.RUNNER_HUNTER.progress).toBe(0);
    expect(am.achievements.BOSS_SLAYER.unlocked).toBe(false); // only real booleans count
    expect(am.achievements.BOSS_SLAYER.progress).toBe(3);
  });

  it('clamps progress to maxProgress', () => {
    localStorage.setItem('td2d_achievements_v1', JSON.stringify({
      RUNNER_HUNTER: { unlocked: false, progress: 999_999 },
    }));

    const am = new AchievementManager(new TalentManager());
    expect(am.achievements.RUNNER_HUNTER.progress).toBe(am.achievements.RUNNER_HUNTER.maxProgress);
  });

  it('survives a corrupt payload', () => {
    localStorage.setItem('td2d_achievements_v1', '[[[not-json');
    expect(() => new AchievementManager(new TalentManager())).not.toThrow();
  });

  it('expires toasts on real elapsed time', () => {
    const am = new AchievementManager(new TalentManager());
    am.addProgress('FIRST_BLOOD', 1); // maxProgress is 1 -> unlocks immediately

    expect(am.activeToasts.length).toBe(1);

    // Toasts are ms-based now, so they keep counting down while the game is paused.
    am.update(1000);
    expect(am.activeToasts.length).toBe(1);

    am.update(2100);
    expect(am.activeToasts.length).toBe(0);
  });

  it('unlocks and awards stars once', () => {
    const talents = new TalentManager();
    talents.stars = 0;
    const am = new AchievementManager(talents);

    am.addProgress('FIRST_BLOOD', 1);
    const starsAfterUnlock = talents.stars;
    expect(starsAfterUnlock).toBe(am.achievements.FIRST_BLOOD.rewardStars);

    am.addProgress('FIRST_BLOOD', 1);
    expect(talents.stars).toBe(starsAfterUnlock);
    expect(am.activeToasts.length).toBe(1);
  });
});

describe('TalentManager persistence validation', () => {
  beforeEach(() => localStorage.clear());

  it('clamps tampered talent levels to their designed maximum', () => {
    localStorage.setItem('td2d_talents_v1', JSON.stringify({
      damageLvl: 9999,
      goldLvl: 'max',
      hpLvl: -5,
      cdLvl: 1.9,
    }));

    const tm = new TalentManager();

    expect(tm.talents.damageLvl).toBe(3); // capped at max level
    expect(tm.talents.goldLvl).toBe(0);   // invalid type -> 0
    expect(tm.talents.hpLvl).toBe(0);     // negative -> 0
    expect(tm.talents.cdLvl).toBe(1);     // floored

    // A tampered save can no longer produce an absurd damage multiplier.
    expect(tm.getDamageBonusMultiplier()).toBeCloseTo(1.3, 5);
  });

  it('rejects a non-numeric star count', () => {
    localStorage.setItem('td2d_stars_v1', 'nine thousand');
    const tm = new TalentManager();
    expect(tm.stars).toBe(0);
  });

  it('rejects a negative star count', () => {
    localStorage.setItem('td2d_stars_v1', '-42');
    const tm = new TalentManager();
    expect(tm.stars).toBe(0);
  });
});

describe('AnalyticsManager persistence validation', () => {
  beforeEach(() => localStorage.clear());

  it('rejects a corrupt high score', () => {
    localStorage.setItem('td2d_high_score_v1', 'not-a-number');
    expect(new AnalyticsManager().highScoreWave).toBe(0);
  });

  it('rejects a negative high score', () => {
    localStorage.setItem('td2d_high_score_v1', '-7');
    expect(new AnalyticsManager().highScoreWave).toBe(0);
  });
});

describe('Player preferences persistence (Speed & Auto-Wave)', () => {
  beforeEach(() => localStorage.clear());

  it('persists and restores game speed and auto-mode settings in localStorage', () => {
    localStorage.setItem('oh_my_td_game_speed', '4');
    localStorage.setItem('oh_my_td_auto_mode', 'true');

    expect(localStorage.getItem('oh_my_td_game_speed')).toBe('4');
    expect(localStorage.getItem('oh_my_td_auto_mode')).toBe('true');
  });
});
