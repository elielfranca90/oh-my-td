export type GameStatus = 'PLAYING' | 'GAME_OVER' | 'VICTORY';

export class GameState {
  public gold = 50; // Started with 50g
  public baseHp = 20;
  public maxBaseHp = 20;
  public currentWave = 0;
  public maxWaves = 10;
  public status: GameStatus = 'PLAYING';
  public isPaused = false;

  public togglePause(): boolean {
    if (this.status !== 'PLAYING') return false;
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public addGold(amount: number) {
    this.gold += amount;
  }

  public spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      return true;
    }
    return false;
  }

  public takeDamage(amount = 1) {
    this.baseHp = Math.max(0, this.baseHp - amount);
    if (this.baseHp <= 0) {
      this.status = 'GAME_OVER';
    }
  }

  public nextWave() {
    this.currentWave++;
  }
}
