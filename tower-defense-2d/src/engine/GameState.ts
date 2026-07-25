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

  constructor(_talentManager?: TalentManager, challengeMode: ChallengeMode = 'NORMAL') {
    this.challengeMode = challengeMode;

    // Fixed Starting Gold (70) & Base HP (10) as requested
    this.gold = 70;

    if (this.challengeMode === 'HARDCORE' || this.challengeMode === 'MORTE_CERTA') {
      this.maxBaseHp = 1;
      this.baseHp = 1;
    } else {
      this.maxBaseHp = 10;
      this.baseHp = 10;
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
