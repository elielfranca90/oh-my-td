export type EnemyType = 'STANDARD' | 'RUNNER' | 'TANK' | 'BOSS';

export interface WaveConfig {
  waveNumber: number;
  enemies: { type: EnemyType; delay: number }[];
}

export class WaveManager {
  public waves: WaveConfig[] = [
    // Waves 1 to 10 (Base campaign)
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
    {
      waveNumber: 3,
      enemies: [
        { type: 'STANDARD', delay: 900 },
        { type: 'TANK', delay: 1800 },
        { type: 'STANDARD', delay: 900 },
        { type: 'TANK', delay: 1800 },
        { type: 'RUNNER', delay: 700 },
        { type: 'TANK', delay: 1800 },
      ],
    },
    {
      waveNumber: 4,
      enemies: [
        { type: 'RUNNER', delay: 500 },
        { type: 'RUNNER', delay: 500 },
        { type: 'RUNNER', delay: 500 },
        { type: 'TANK', delay: 1400 },
        { type: 'TANK', delay: 1400 },
        { type: 'RUNNER', delay: 500 },
        { type: 'TANK', delay: 1400 },
      ],
    },
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
    {
      waveNumber: 6,
      enemies: [
        { type: 'RUNNER', delay: 450 },
        { type: 'RUNNER', delay: 450 },
        { type: 'RUNNER', delay: 450 },
        { type: 'TANK', delay: 1200 },
        { type: 'TANK', delay: 1200 },
        { type: 'RUNNER', delay: 450 },
        { type: 'TANK', delay: 1200 },
        { type: 'RUNNER', delay: 450 },
      ],
    },
    {
      waveNumber: 7,
      enemies: [
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
      ],
    },
    {
      waveNumber: 8,
      enemies: [
        { type: 'TANK', delay: 1000 },
        { type: 'TANK', delay: 1000 },
        { type: 'BOSS', delay: 2000 },
        { type: 'RUNNER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'TANK', delay: 1000 },
      ],
    },
    {
      waveNumber: 9,
      enemies: [
        { type: 'RUNNER', delay: 350 },
        { type: 'RUNNER', delay: 350 },
        { type: 'TANK', delay: 900 },
        { type: 'RUNNER', delay: 350 },
        { type: 'TANK', delay: 900 },
        { type: 'RUNNER', delay: 350 },
        { type: 'TANK', delay: 900 },
        { type: 'RUNNER', delay: 350 },
        { type: 'RUNNER', delay: 350 },
      ],
    },
    {
      waveNumber: 10,
      enemies: [
        { type: 'TANK', delay: 800 },
        { type: 'TANK', delay: 800 },
        { type: 'BOSS', delay: 2000 },
        { type: 'RUNNER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'TANK', delay: 800 },
        { type: 'BOSS', delay: 2500 },
        { type: 'RUNNER', delay: 400 },
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
  }

  public setEndlessMode(enabled: boolean) {
    this.isEndlessMode = enabled;
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
    return true;
  }

  private generateEndlessWave(waveNum: number): WaveConfig {
    const enemyTypes: EnemyType[] = ['STANDARD', 'RUNNER', 'TANK'];
    const count = 12 + Math.floor((waveNum - 10) * 2);
    const enemies: { type: EnemyType; delay: number }[] = [];
    const baseDelay = Math.max(250, 750 - (waveNum - 10) * 25);

    for (let i = 0; i < count; i++) {
      const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push({ type: randomType, delay: baseDelay });
    }

    // Add Bosses based on endless wave progress
    const bossCount = Math.floor((waveNum - 10) / 3) + 1;
    for (let b = 0; b < bossCount; b++) {
      enemies.push({ type: 'BOSS', delay: 1800 });
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

  public getNextEnemyToSpawn(deltaTimeMs: number): EnemyType | null {
    if (!this.isWaveActive || this.spawnQueue.length === 0) return null;

    this.timer += deltaTimeMs;
    if (this.timer >= this.spawnQueue[0].delay) {
      this.timer = 0;
      const enemy = this.spawnQueue.shift();
      return enemy ? enemy.type : null;
    }

    return null;
  }

  public onEnemyCleared(remainingEnemiesCount: number): boolean {
    if (this.isWaveActive && this.spawnQueue.length === 0 && remainingEnemiesCount === 0) {
      this.isWaveActive = false;
      this.autoCountdownMs = 5000;
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
