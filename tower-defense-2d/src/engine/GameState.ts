import type { ChallengeMode } from '../types';
import { EventBus } from './EventBus';
import { TalentManager } from './TalentManager';

export type GameStatus = 'PLAYING' | 'GAME_OVER' | 'VICTORY';

export class GameState {
  public gold: number;
  public baseHp: number;
  public maxBaseHp: number;
  public currentWave = 0;
  public maxWaves = 10;
  public status: GameStatus = 'PLAYING';
  public isPaused = false;
  public challengeMode: ChallengeMode = 'NORMAL';

  constructor(talentManager?: TalentManager, challengeMode: ChallengeMode = 'NORMAL') {
    this.challengeMode = challengeMode;
    const goldBonus = talentManager ? talentManager.getStartingGoldBonus() : 0;
    const hpBonus = talentManager ? talentManager.getBaseHpBonus() : 0;

    this.gold = 70 + goldBonus;
    if (this.challengeMode === 'HARDCORE') {
      this.maxBaseHp = 1;
      this.baseHp = 1;
    } else {
      this.maxBaseHp = 20 + hpBonus;
      this.baseHp = 20 + hpBonus;
    }
  }

  public togglePause(): boolean {
    if (this.status !== 'PLAYING') return false;
    this.isPaused = !this.isPaused;
    EventBus.getInstance().emit('pause:change', this.isPaused);
    return this.isPaused;
  }

  public addGold(amount: number) {
    this.gold += amount;
    EventBus.getInstance().emit('gold:change', this.gold);
  }

  public spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      EventBus.getInstance().emit('gold:change', this.gold);
      return true;
    }
    return false;
  }

  public takeDamage(amount = 1) {
    this.baseHp = Math.max(0, this.baseHp - amount);
    EventBus.getInstance().emit('hp:change', { current: this.baseHp, max: this.maxBaseHp });
    if (this.baseHp <= 0) {
      this.status = 'GAME_OVER';
      EventBus.getInstance().emit('status:change', this.status);
    }
  }

  public nextWave() {
    this.currentWave++;
    EventBus.getInstance().emit('wave:change', { current: this.currentWave, max: this.maxWaves });
  }
}
