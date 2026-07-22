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
  life: number; // frames (~3 sec)
}

export class AchievementManager {
  private talentManager: TalentManager;
  private readonly STORAGE_KEY = 'td2d_achievements_v1';

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

  private loadAchievements() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved !== null) {
        const parsed: Record<string, { unlocked: boolean; progress: number }> = JSON.parse(saved);
        for (const id of Object.keys(parsed)) {
          if (this.achievements[id]) {
            this.achievements[id].unlocked = parsed[id].unlocked || false;
            this.achievements[id].progress = parsed[id].progress || 0;
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  public saveAchievements() {
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
      this.saveAchievements();
    }
  }

  public setProgress(id: string, value: number) {
    const ach = this.achievements[id];
    if (!ach || ach.unlocked) return;

    ach.progress = Math.min(ach.maxProgress, Math.max(ach.progress, value));
    if (ach.progress >= ach.maxProgress) {
      this.unlockAchievement(ach);
    } else {
      this.saveAchievements();
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
      id: `toast-${Date.now()}-${Math.random()}`,
      title: ach.title,
      reward: ach.rewardStars,
      icon: ach.icon,
      life: 180, // 3s at 60fps
    });
  }

  public update() {
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const toast = this.activeToasts[i];
      toast.life--;
      if (toast.life <= 0) {
        this.activeToasts.splice(i, 1);
      }
    }
  }
}
