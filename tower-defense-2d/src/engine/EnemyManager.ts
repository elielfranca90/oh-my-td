import type { EnemyType, Vector2D } from '../types';

import { AnalyticsManager } from './AnalyticsManager';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { GameState } from './GameState';
import { MapManager2D } from './MapManager';
import { WaveManager } from './WaveManager';

export class EnemyManager2D {
  private enemies: Enemy2D[] = [];
  private mapManager: MapManager2D;
  private gameState: GameState;
  private waveManager: WaveManager;
  private audioManager: AudioManager;
  private analyticsManager?: AnalyticsManager;
  private spawnToggle = false;

  constructor(
    mapManager: MapManager2D,
    gameState: GameState,
    waveManager: WaveManager,
    audioManager: AudioManager,
    analyticsManager?: AnalyticsManager
  ) {
    this.mapManager = mapManager;
    this.gameState = gameState;
    this.waveManager = waveManager;
    this.audioManager = audioManager;
    this.analyticsManager = analyticsManager;
  }

  public update(deltaTimeMs: number) {
    // 1. Spawn from wave manager
    const spawnInfo = this.waveManager.getNextEnemyToSpawn(deltaTimeMs);
    if (spawnInfo) {
      this.spawnEnemy(spawnInfo.type, spawnInfo.hpMultiplier);
    }

    // 2. Update existing enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.data.isDead) {
        this.gameState.addGold(enemy.data.goldReward);
        this.audioManager.playCoin();

        if (this.analyticsManager) {
          this.analyticsManager.recordKill(enemy.data.type);
          this.analyticsManager.recordGoldEarned(enemy.data.goldReward);
        }

        // Boss Death Reinforcements: Spawn 2 Runners!
        if (enemy.data.type === 'BOSS') {
          this.spawnReinforcements(enemy.data.waypointIndex, enemy.data.position);
        }

        this.enemies.splice(i, 1);
        continue;
      }

      const waypoints = this.mapManager.getWaypoints(enemy.pathIndex);
      const reachedBase = enemy.update(waypoints);
      if (reachedBase) {
        this.gameState.takeDamage(enemy.baseDamage);
        this.audioManager.playBaseDamage();
        this.enemies.splice(i, 1);
      }
    }

    // 3. Check wave completion
    this.waveManager.onEnemyCleared(this.enemies.length);
  }

  private spawnReinforcements(waypointIndex: number, position: Vector2D) {
    for (let r = 0; r < 2; r++) {
      const waypoints = this.mapManager.getWaypoints(0);
      const runner = new Enemy2D(waypoints, 'RUNNER', `runner-boss-${Date.now()}-${r}`);
      runner.data.waypointIndex = waypointIndex;
      runner.data.position = { x: position.x + (r * 12 - 6), y: position.y + (r * 12 - 6) };
      this.enemies.push(runner);
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }
  }

  private spawnEnemy(type: EnemyType, hpMultiplier = 1.0) {
    if (type === 'BOSS') {
      this.audioManager.playBossAlert();
    }

    // Determine path index (0 = Left, 1 = Right for Map 2 Dual Spawn)
    let pathIndex = 0;
    if (this.mapManager.currentMapId === 'MAP_2') {
      this.spawnToggle = !this.spawnToggle;
      pathIndex = this.spawnToggle ? 1 : 0;
    }

    const waypoints = this.mapManager.getWaypoints(pathIndex);
    const enemy = new Enemy2D(waypoints, type, `enemy-${Date.now()}-${Math.random()}`, hpMultiplier, pathIndex);
    this.enemies.push(enemy);
  }

  public getEnemies(): Enemy2D[] {
    return this.enemies;
  }
}
