import { TalentManager } from './TalentManager';

export type GameStatus = 'PLAYING' | 'GAME_OVER' | 'VICTORY';

export class GameState {
  public gold: number;
  public baseHp: number;
  public maxBaseHp: number;
  public status: GameStatus = 'PLAYING';
  public isPaused = false;

  constructor(talentManager?: TalentManager) {
    const goldBonus = talentManager ? talentManager.getStartingGoldBonus() : 0;
    const hpBonus = talentManager ? talentManager.getBaseHpBonus() : 0;

    this.gold = 50 + goldBonus;
    this.maxBaseHp = 20 + hpBonus;
    this.baseHp = 20 + hpBonus;
  }

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
}
