import type { EnemyType, TowerType } from '../types';

export class AnalyticsManager {
  public highScoreWave = 0;
  public isNewRecord = false;

  public damageByTower: Record<TowerType, number> = {
    BASIC: 0,
    FROST: 0,
    SOLAR_PRISM: 0,
    CANNON: 0,
    ARTILLERY: 0,
  };

  public killsByEnemy: Record<EnemyType, number> = {
    STANDARD: 0,
    RUNNER: 0,
    TANK: 0,
    SHIELDED: 0,
    SPORE_SPRINTER: 0,
    MOSS_GIANT: 0,
    BOSS: 0,
  };

  public goldEarned = 0;
  public goldSpent = 0;

  private readonly HIGH_SCORE_KEY = 'td2d_high_score_v1';

  constructor() {
    this.loadHighScore();
  }

  private loadHighScore() {
    try {
      const saved = localStorage.getItem(this.HIGH_SCORE_KEY);
      if (saved !== null) {
        this.highScoreWave = parseInt(saved, 10) || 0;
      }
    } catch {
      // Ignore
    }
  }

  public checkHighScore(currentWave: number): boolean {
    if (currentWave > this.highScoreWave) {
      this.highScoreWave = currentWave;
      this.isNewRecord = true;
      try {
        localStorage.setItem(this.HIGH_SCORE_KEY, this.highScoreWave.toString());
      } catch {
        // Ignore
      }
      return true;
    }
    return false;
  }

  public recordDamage(towerType: TowerType, amount: number) {
    if (amount <= 0) return;
    this.damageByTower[towerType] = (this.damageByTower[towerType] || 0) + amount;
  }

  public recordKill(enemyType: EnemyType) {
    this.killsByEnemy[enemyType] = (this.killsByEnemy[enemyType] || 0) + 1;
  }

  public recordGoldEarned(amount: number) {
    if (amount > 0) this.goldEarned += amount;
  }

  public recordGoldSpent(amount: number) {
    if (amount > 0) this.goldSpent += amount;
  }

  public getMvpTower(): { type: TowerType; damage: number } {
    let mvpType: TowerType = 'BASIC';
    let maxDamage = -1;

    for (const key of Object.keys(this.damageByTower) as TowerType[]) {
      if (this.damageByTower[key] > maxDamage) {
        maxDamage = this.damageByTower[key];
        mvpType = key;
      }
    }

    return { type: mvpType, damage: Math.max(0, maxDamage) };
  }

  public getTotalKills(): number {
    return Object.values(this.killsByEnemy).reduce((acc, curr) => acc + curr, 0);
  }

  public getTotalDamage(): number {
    return Object.values(this.damageByTower).reduce((acc, curr) => acc + curr, 0);
  }
}
