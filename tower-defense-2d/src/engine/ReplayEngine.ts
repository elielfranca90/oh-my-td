import type {
  MatchReplayData,
  PlayerActionInput,
  PlayerActionType,
  TowerType,
  TowerSpecialization,
  RogueliteModuleId,
  MapId,
  ChallengeMode,
} from '../types';

export class ReplayEngine {
  private currentTick = 0;
  private actions: PlayerActionInput[] = [];
  public isRecording = true;
  public isReplaying = false;
  private replayData: MatchReplayData | null = null;
  private replayActionIndex = 0;
  public readonly seed: number;
  public readonly mapId: MapId;
  public readonly challengeMode: ChallengeMode;

  constructor(
    seed: number = Date.now(),
    mapId: MapId = 'MAP_1',
    challengeMode: ChallengeMode = 'NORMAL'
  ) {
    this.seed = seed;
    this.mapId = mapId;
    this.challengeMode = challengeMode;
  }
  public recordAction(
    type: PlayerActionType,
    params: {
      gridX?: number;
      gridY?: number;
      towerType?: TowerType;
      specialization?: TowerSpecialization;
      moduleId?: RogueliteModuleId;
    } = {}
  ) {
    if (!this.isRecording) return;
    this.actions.push({
      tick: this.currentTick,
      type,
      ...params,
    });
  }

  public advanceTick(): PlayerActionInput[] {
    const tickNow = this.currentTick;
    this.currentTick++;

    if (!this.isReplaying || !this.replayData) return [];

    const actionsToExecute: PlayerActionInput[] = [];
    while (
      this.replayActionIndex < this.replayData.actions.length &&
      this.replayData.actions[this.replayActionIndex].tick === tickNow
    ) {
      actionsToExecute.push(this.replayData.actions[this.replayActionIndex]);
      this.replayActionIndex++;
    }
    return actionsToExecute;
  }
  public getSimTick(): number {
    return this.currentTick;
  }

  public exportReplay(finalWave: number, finalScore: number): MatchReplayData {
    return {
      seed: this.seed,
      mapId: this.mapId,
      challengeMode: this.challengeMode,
      actions: [...this.actions],
      finalWave,
      finalScore,
    };
  }

  public loadReplay(replay: MatchReplayData) {
    this.replayData = replay;
    this.isRecording = false;
    this.isReplaying = true;
    this.currentTick = 0;
    this.replayActionIndex = 0;
  }
}
