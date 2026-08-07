import { createId } from './ids';
import { TalentManager } from './TalentManager';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  rewardStars: number;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  icon: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  reward: number;
  icon: string;
  lifeMs: number;
}

const TOAST_LIFETIME_MS = 3000;
const SAVE_DEBOUNCE_MS = 1000;

export class AchievementManager {
  private talentManager: TalentManager;
  private readonly STORAGE_KEY = 'td2d_achievements_v1';
  private saveTimeoutId: number | null = null;

  public achievements: Record<string, Achievement> = {
    FIRST_BLOOD: {
      id: 'FIRST_BLOOD',
      title: 'First Blood',
      desc: 'Defeat your first enemy',
      rewardStars: 2,
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      icon: '⚔️',
    },
    RUNNER_HUNTER: {
      id: 'RUNNER_HUNTER',
      title: 'Runner Hunter',
      desc: 'Defeat 30 Runner enemies',
      rewardStars: 3,
      unlocked: false,
      progress: 0,
      maxProgress: 30,
      icon: '🏃',
    },
    SHIELD_BREAKER: {
      id: 'SHIELD_BREAKER',
      title: 'Shield Breaker',
      desc: 'Break 20 Energy Shields',
      rewardStars: 3,
      unlocked: false,
      progress: 0,
      maxProgress: 20,
      icon: '🔮',
    },
    BOSS_SLAYER: {
      id: 'BOSS_SLAYER',
      title: 'Boss Slayer',
      desc: 'Defeat 5 Bosses',
      rewardStars: 5,
      unlocked: false,
      progress: 0,
      maxProgress: 5,
      icon: '👑',
    },
    METEOR_STRIKE: {
      id: 'METEOR_STRIKE',
      title: 'Armageddon',
      desc: 'Cast Meteor Strike 3 times',
      rewardStars: 3,
      unlocked: false,
      progress: 0,
      maxProgress: 3,
      icon: '☄️',
    },
    GLOBAL_FREEZE: {
      id: 'GLOBAL_FREEZE',
      title: 'Absolute Zero',
      desc: 'Cast Global Freeze 3 times',
      rewardStars: 3,
      unlocked: false,
      progress: 0,
      maxProgress: 3,
      icon: '❄️',
    },
    ENDLESS_SURVIVOR: {
      id: 'ENDLESS_SURVIVOR',
      title: 'Endless Survivor',
      desc: 'Reach Wave 20 in Endless Mode',
      rewardStars: 5,
      unlocked: false,
      progress: 0,
      maxProgress: 20,
      icon: '♾️',
    },
  };

  public activeToasts: ToastNotification[] = [];

  constructor(talentManager: TalentManager) {
    this.talentManager = talentManager;
    this.loadAchievements();
  }

  /**
   * localStorage is untrusted input: a tampered payload used to inject arbitrary values
   * into `progress` (it was only guarded by `|| 0`, so any truthy string passed through
   * and was later interpolated into the badges modal).
   */
  private loadAchievements() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === null) return;

      const parsed: unknown = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null) return;

      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        const ach = this.achievements[id];
        if (!ach) continue;
        if (typeof value !== 'object' || value === null) continue;

        const entry = value as Record<string, unknown>;
        const progress = entry.progress;
        ach.unlocked = entry.unlocked === true;
        ach.progress = typeof progress === 'number' && Number.isFinite(progress)
          ? Math.max(0, Math.min(ach.maxProgress, Math.floor(progress)))
          : 0;
        if (ach.unlocked) ach.progress = ach.maxProgress;
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Coalesces writes: saving synchronously on every single kill blocked the frame up to
   * 30 times per achievement.
   */
  private scheduleSave() {
    if (this.saveTimeoutId !== null) return;
    if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') {
      this.saveAchievements();
      return;
    }
    this.saveTimeoutId = window.setTimeout(() => {
      this.saveTimeoutId = null;
      this.saveAchievements();
    }, SAVE_DEBOUNCE_MS);
  }

  public saveAchievements() {
    if (this.saveTimeoutId !== null) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
    try {
      const data: Record<string, { unlocked: boolean; progress: number }> = {};
      for (const id of Object.keys(this.achievements)) {
        data[id] = {
          unlocked: this.achievements[id].unlocked,
          progress: this.achievements[id].progress,
        };
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }

  public addProgress(id: string, amount = 1) {
    const ach = this.achievements[id];
    if (!ach || ach.unlocked) return;

    ach.progress = Math.min(ach.maxProgress, ach.progress + amount);
    if (ach.progress >= ach.maxProgress) {
      this.unlockAchievement(ach);
    } else {
      this.scheduleSave();
    }
  }

  public setProgress(id: string, value: number) {
    const ach = this.achievements[id];
    if (!ach || ach.unlocked) return;

    const previous = ach.progress;
    ach.progress = Math.min(ach.maxProgress, Math.max(ach.progress, value));
    if (ach.progress >= ach.maxProgress) {
      this.unlockAchievement(ach);
    } else if (ach.progress !== previous) {
      this.scheduleSave();
    }
  }

  private unlockAchievement(ach: Achievement) {
    ach.unlocked = true;
    ach.progress = ach.maxProgress;
    this.saveAchievements();

    // Award bonus Stars to TalentManager
    this.talentManager.earnStars(ach.rewardStars);

    // Add Toast Notification
    this.activeToasts.push({
      id: createId('toast'),
      title: ach.title,
      reward: ach.rewardStars,
      icon: ach.icon,
      lifeMs: TOAST_LIFETIME_MS,
    });
  }

  /** Driven by real elapsed time so toasts keep expiring while the game is paused. */
  public update(deltaTimeMs: number) {
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const toast = this.activeToasts[i];
      toast.lifeMs -= deltaTimeMs;
      if (toast.lifeMs <= 0) {
        this.activeToasts.splice(i, 1);
      }
    }
  }
}
