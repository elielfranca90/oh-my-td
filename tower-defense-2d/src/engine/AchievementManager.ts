import type { DatabaseManager } from './DatabaseManager';

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

export class AchievementManager {
  private talentManager: TalentManager;
  private db: DatabaseManager | null = null;
  private readonly STORAGE_KEY = 'td2d_achievements_v1';

  constructor(talentManager: TalentManager, db?: DatabaseManager) {
    this.talentManager = talentManager;
    this.db = db || null;
    this.loadAchievements();
    if (this.db) {
      this.syncWithRemote();
    }
  }
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
    FIELD_ENGINEER: {
      id: 'FIELD_ENGINEER',
      title: 'Field Engineer',
      desc: 'Repair damaged towers 10 times',
      rewardStars: 4,
      unlocked: false,
      progress: 0,
      maxProgress: 10,
      icon: '🔧',
    },
    BLACK_BOSS_VANQUISHER: {
      id: 'BLACK_BOSS_VANQUISHER',
      title: 'Nightmare Slayer',
      desc: 'Defeat Black Mega Boss in Death Mode',
      rewardStars: 6,
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      icon: '💀',
    },
  };

  public activeToasts: ToastNotification[] = [];

  /**
   * Fonte de verdade para o total de conquistas existentes. Qualquer UI que
   * precise exibir "X/Y Badges" deve ler daqui em vez de fixar Y como
   * literal — do contrário o número dessincroniza sempre que uma conquista
   * for adicionada ou removida deste mapa (já aconteceu: literal "7" ficou
   * parado enquanto o jogo cresceu para 9 conquistas).
   */
  public get totalCount(): number {
    return Object.keys(this.achievements).length;
  }


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

  public setDatabaseManager(db: DatabaseManager) {
    this.db = db;
    this.syncWithRemote();
  }

  public async syncWithRemote() {
    if (!this.db || !this.db.isConnected()) return;
    const remote = await this.db.fetchRemoteAchievements();
    if (remote) {
      let localChanged = false;
      let localHadHigher = false;

      for (const id of Object.keys(this.achievements)) {
        const localAch = this.achievements[id];
        const remoteAch = remote[id];

        if (remoteAch) {
          if (!localAch.unlocked && remoteAch.unlocked) {
            localAch.unlocked = true;
            localChanged = true;
          } else if (localAch.unlocked && !remoteAch.unlocked) {
            localHadHigher = true;
          }

          if (remoteAch.progress > localAch.progress) {
            localAch.progress = remoteAch.progress;
            localChanged = true;
          } else if (localAch.progress > remoteAch.progress) {
            localHadHigher = true;
          }
        } else if (localAch.unlocked || localAch.progress > 0) {
          localHadHigher = true;
        }
      }

      if (localChanged) {
        this.saveLocalAchievements();
      }

      if (localHadHigher) {
        for (const id of Object.keys(this.achievements)) {
          const ach = this.achievements[id];
          this.db.queueAchievementSync(id, ach.progress, ach.unlocked);
        }
      }
    } else {
      for (const id of Object.keys(this.achievements)) {
        const ach = this.achievements[id];
        this.db.queueAchievementSync(id, ach.progress, ach.unlocked);
      }
    }
  }

  private saveLocalAchievements() {
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

  public saveAchievements() {
    this.saveLocalAchievements();
    if (this.db) {
      for (const id of Object.keys(this.achievements)) {
        const ach = this.achievements[id];
        this.db.queueAchievementSync(id, ach.progress, ach.unlocked);
      }
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
      lifeMs: 3000,
    });
  }

  public update(deltaTimeMs = 16.66) {
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const toast = this.activeToasts[i];
      toast.lifeMs -= deltaTimeMs;
      if (toast.lifeMs <= 0) {
        this.activeToasts.splice(i, 1);
      }
    }
  }
}
