import { EventBus } from './EventBus';

import type { EnemyType } from '../types';

export interface WaveConfig {
  waveNumber: number;
  enemies: { type: EnemyType; delay: number }[];
}

export class WaveManager {
  public waves: WaveConfig[] = [
    // Wave 1
    {
      waveNumber: 1,
      enemies: [
        { type: 'STANDARD', delay: 1000 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
      ],
    },
    // Wave 2
    {
      waveNumber: 2,
      enemies: [
        { type: 'STANDARD', delay: 1000 },
        { type: 'RUNNER', delay: 700 },
        { type: 'RUNNER', delay: 700 },
        { type: 'STANDARD', delay: 1000 },
        { type: 'RUNNER', delay: 700 },
        { type: 'RUNNER', delay: 700 },
        { type: 'STANDARD', delay: 1000 },
      ],
    },
    // Wave 3
    {
      waveNumber: 3,
      enemies: [
        { type: 'STANDARD', delay: 900 },
        { type: 'SPORE_SPRINTER', delay: 1000 },
        { type: 'TANK', delay: 1800 },
        { type: 'STANDARD', delay: 900 },
        { type: 'SPORE_SPRINTER', delay: 1000 },
        { type: 'TANK', delay: 1800 },
      ],
    },
    // Wave 4
    {
      waveNumber: 4,
      enemies: [
        { type: 'RUNNER', delay: 500 },
        { type: 'SPORE_SPRINTER', delay: 600 },
        { type: 'RUNNER', delay: 500 },
        { type: 'TANK', delay: 1400 },
        { type: 'MOSS_GIANT', delay: 2000 },
        { type: 'RUNNER', delay: 500 },
      ],
    },
    // Wave 5 - MID-GAME BOSS
    {
      waveNumber: 5,
      enemies: [
        { type: 'STANDARD', delay: 800 },
        { type: 'TANK', delay: 1200 },
        { type: 'TANK', delay: 1200 },
        { type: 'BOSS', delay: 2500 },
        { type: 'RUNNER', delay: 600 },
        { type: 'RUNNER', delay: 600 },
      ],
    },
    // Wave 6
    {
      waveNumber: 6,
      enemies: [
        { type: 'MOSS_GIANT', delay: 1800 },
        { type: 'RUNNER', delay: 450 },
        { type: 'RUNNER', delay: 450 },
        { type: 'TANK', delay: 1200 },
        { type: 'MOSS_GIANT', delay: 1800 },
        { type: 'RUNNER', delay: 450 },
      ],
    },
    // Wave 7 - SWARM
    {
      waveNumber: 7,
      enemies: [
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'SPORE_SPRINTER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'SPORE_SPRINTER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
      ],
    },
    // Wave 8 - BOSS + ESCORT
    {
      waveNumber: 8,
      enemies: [
        { type: 'TANK', delay: 1000 },
        { type: 'MOSS_GIANT', delay: 1600 },
        { type: 'BOSS', delay: 2000 },
        { type: 'RUNNER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'TANK', delay: 1000 },
      ],
    },
    // Wave 9 - CHAOS
    {
      waveNumber: 9,
      enemies: [
        { type: 'RUNNER', delay: 350 },
        { type: 'SPORE_SPRINTER', delay: 350 },
        { type: 'TANK', delay: 900 },
        { type: 'MOSS_GIANT', delay: 1600 },
        { type: 'TANK', delay: 900 },
        { type: 'RUNNER', delay: 350 },
      ],
    },
    // Wave 10 - ULTIMATE BOSS WAVE
    {
      waveNumber: 10,
      enemies: [
        { type: 'TANK', delay: 800 },
        { type: 'MOSS_GIANT', delay: 1600 },
        { type: 'BOSS', delay: 2000 },
        { type: 'RUNNER', delay: 400 },
        { type: 'BLACK_MEGA_BOSS', delay: 3000 },
        { type: 'RUNNER', delay: 400 },
        { type: 'TANK', delay: 800 },
      ],
    },
  ];

  public currentWaveIndex = -1;
  public isWaveActive = false;

  // Auto Mode & Endless Mode
  public isAutoMode = false;
  public isEndlessMode = false;
  public autoCountdownMs = 5000;

  private spawnQueue: { type: EnemyType; delay: number }[] = [];
  private timer = 0;

  public setAutoMode(enabled: boolean) {
    this.isAutoMode = enabled;
    if (enabled && !this.isWaveActive) {
      this.autoCountdownMs = 5000;
    }
    EventBus.getInstance().emit('wave:autoMode', this.isAutoMode);
  }

  public setEndlessMode(enabled: boolean) {
    this.isEndlessMode = enabled;
    EventBus.getInstance().emit('wave:endlessMode', this.isEndlessMode);
  }

  public startNextWave(): boolean {
    if (this.isWaveActive) return false;

    const nextIndex = this.currentWaveIndex + 1;

    // Check if we need to procedurally generate endless waves
    if (nextIndex >= this.waves.length) {
      if (!this.isEndlessMode) return false;
      const newWave = this.generateEndlessWave(nextIndex + 1);
      this.waves.push(newWave);
    }

    this.currentWaveIndex = nextIndex;
    this.spawnQueue = [...this.waves[this.currentWaveIndex].enemies];
    this.isWaveActive = true;
    this.timer = 0;
    EventBus.getInstance().emit('wave:start', { currentWave: this.currentWaveIndex + 1, isEndless: this.isEndlessMode });
    EventBus.getInstance().emit('wave:change', { current: this.currentWaveIndex + 1, max: 10, isEndless: this.isEndlessMode });
    return true;
  }

  private generateEndlessWave(waveNum: number): WaveConfig {
    const enemyTypes: EnemyType[] = ['STANDARD', 'RUNNER', 'TANK', 'SPORE_SPRINTER', 'MOSS_GIANT'];
    const count = 12 + Math.floor((waveNum - 10) * 2);
    const enemies: { type: EnemyType; delay: number }[] = [];
    const baseDelay = Math.max(250, 750 - (waveNum - 10) * 25);

    for (let i = 0; i < count; i++) {
      const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push({ type: randomType, delay: baseDelay });
    }

    const bossCount = Math.floor((waveNum - 10) / 3) + 1;
    for (let b = 0; b < bossCount; b++) {
      enemies.push({ type: 'BOSS', delay: 1800 });
    }
    if (waveNum % 10 === 0) {
      enemies.push({ type: 'BLACK_MEGA_BOSS', delay: 3000 });
    }

    return {
      waveNumber: waveNum,
      enemies,
    };
  }

  public updateAutoCountdown(deltaTimeMs: number) {
    if (!this.isAutoMode || this.isWaveActive) return;

    // Stop auto countdown if campaign is over and endless mode is off
    if (this.currentWaveIndex >= 9 && !this.isEndlessMode && this.spawnQueue.length === 0) return;

    this.autoCountdownMs -= deltaTimeMs;
    if (this.autoCountdownMs <= 0) {
      this.startNextWave();
      this.autoCountdownMs = 5000;
    }
  }

  public getNextEnemyToSpawn(deltaTimeMs: number): { type: EnemyType; hpMultiplier: number } | null {
    if (!this.isWaveActive || this.spawnQueue.length === 0) return null;

    this.timer += deltaTimeMs;
    if (this.timer >= this.spawnQueue[0].delay) {
      this.timer = 0;
      const enemy = this.spawnQueue.shift();
      if (!enemy) return null;

      const currentWaveNum = this.currentWaveIndex + 1;
      let hpMultiplier = 1.0;
      const campaignHpScales: Record<number, number> = {
        1: 1.0,
        2: 1.15,
        3: 1.3,
        4: 1.5,
        5: 1.85,
        6: 2.2,
        7: 2.6,
        8: 3.1,
        9: 3.7,
        10: 4.5,
      };

      if (currentWaveNum <= 10) {
        hpMultiplier = campaignHpScales[currentWaveNum] || 1.0;
      } else {
        hpMultiplier = Number((4.5 * Math.pow(1.18, currentWaveNum - 10)).toFixed(2));
      }
      return { type: enemy.type, hpMultiplier };
    }

    return null;
  }

  public onEnemyCleared(remainingEnemiesCount: number): boolean {
    if (this.isWaveActive && this.spawnQueue.length === 0 && remainingEnemiesCount === 0) {
      this.isWaveActive = false;
      this.autoCountdownMs = 5000;
      EventBus.getInstance().emit('wave:end', { currentWave: this.currentWaveIndex + 1, isEndless: this.isEndlessMode });
      EventBus.getInstance().emit('wave:change', { current: this.currentWaveIndex + 1, max: 10, isEndless: this.isEndlessMode });
      return true;
    }
    return false;
  }

  public isLastWaveCompleted(remainingEnemiesCount: number): boolean {
    // If endless mode is on, the game NEVER ends on victory!
    if (this.isEndlessMode) return false;

    return (
      this.currentWaveIndex === 9 &&
      this.spawnQueue.length === 0 &&
      remainingEnemiesCount === 0 &&
      !this.isWaveActive
    );
  }

  public getAutoCountdownSeconds(): number {
    return Math.max(0, Math.ceil(this.autoCountdownMs / 1000));
  }
}
