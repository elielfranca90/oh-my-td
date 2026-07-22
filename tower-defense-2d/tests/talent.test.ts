import { describe, expect, it } from 'vitest';
import { TalentManager } from '../src/engine/TalentManager';

describe('TalentManager Unit & Integration Tests', () => {
  it('should earn stars and calculate talent upgrade costs correctly', () => {
    const tm = new TalentManager();
    tm.stars = 0;

    tm.earnStars(10);
    expect(tm.stars).toBe(10);

    const cost = tm.getTalentCost('damageLvl');
    expect(cost).toBe(2);

    const upgraded = tm.upgradeTalent('damageLvl');
    expect(upgraded).toBe(true);
    expect(tm.talents.damageLvl).toBe(1);
    expect(tm.stars).toBe(8);
  });

  it('should calculate bonus multipliers accurately', () => {
    const tm = new TalentManager();
    tm.talents = { damageLvl: 2, goldLvl: 1, hpLvl: 1, cdLvl: 2 };

    expect(tm.getDamageBonusMultiplier()).toBe(1.2); // +20%
    expect(tm.getStartingGoldBonus()).toBe(25); // +25g
    expect(tm.getBaseHpBonus()).toBe(5); // +5 HP
    expect(tm.getSpellCdReduction()).toBe(0.3); // -30% CD
  });
});
