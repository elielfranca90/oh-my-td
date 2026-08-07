import type { EnemyType } from '../types';

import { AchievementManager } from './AchievementManager';
import { AnalyticsManager } from './AnalyticsManager';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { GameState } from './GameState';
import { createId } from './ids';
import { MapManager2D } from './MapManager';
import { WaveManager } from './WaveManager';

export class EnemyManager2D {
  private enemies: Enemy2D[] = [];
  private mapManager: MapManager2D;
  private gameState: GameState;
  private waveManager: WaveManager;
  private audioManager: AudioManager;
  private analyticsManager?: AnalyticsManager;
  private achievementManager?: AchievementManager;
  private spawnToggle = false;

  constructor(
    mapManager: MapManager2D,
    gameState: GameState,
    waveManager: WaveManager,
    audioManager: AudioManager,
    analyticsManager?: AnalyticsManager,
    achievementManager?: AchievementManager
  ) {
    this.mapManager = mapManager;
    this.gameState = gameState;
    this.waveManager = waveManager;
    this.audioManager = audioManager;
    this.analyticsManager = analyticsManager;
    this.achievementManager = achievementManager;
  }

  public update(deltaTimeMs: number) {
    // 1. Spawn from wave manager — drain everything that became due in this step so a
    //    long step never silently discards queued spawns.
    let spawnInfo = this.waveManager.getNextEnemyToSpawn(deltaTimeMs);
    while (spawnInfo) {
      this.spawnEnemy(spawnInfo.type, spawnInfo.hpMultiplier);
      spawnInfo = this.waveManager.getNextEnemyToSpawn(0);
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

        if (this.achievementManager) {
          this.achievementManager.addProgress('FIRST_BLOOD', 1);
          if (enemy.data.type === 'RUNNER') this.achievementManager.addProgress('RUNNER_HUNTER', 1);
          if (enemy.data.type === 'SHIELDED' || enemy.data.maxShieldHp > 0) this.achievementManager.addProgress('SHIELD_BREAKER', 1);
          if (enemy.data.type === 'BOSS') this.achievementManager.addProgress('BOSS_SLAYER', 1);
        }

        // Boss Death Reinforcements: Spawn 2 Runners!
        if (enemy.data.type === 'BOSS') {
          this.spawnReinforcements(enemy);
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

  private spawnReinforcements(boss: Enemy2D) {
    // Inherit the boss' own route (was hardcoded to path 0, sending Map 2 right-portal
    // reinforcements down the left route).
    const pathIndex = boss.pathIndex;
    const waypoints = this.mapManager.getWaypoints(pathIndex);

    // Clamp so the runner always has at least one waypoint ahead of it. Otherwise
    // `waypoints[index + 1]` was undefined and Enemy.update() reported "reached base"
    // on the very first step — free guaranteed damage on every boss kill.
    const lastReachableIndex = Math.max(0, waypoints.length - 2);
    const startIndex = Math.min(Math.max(0, boss.data.waypointIndex), lastReachableIndex);

    for (let r = 0; r < 2; r++) {
      const runner = new Enemy2D(waypoints, 'RUNNER', createId('runner-boss'), 1.0, pathIndex);
      runner.data.waypointIndex = startIndex;
      runner.data.position = {
        x: boss.data.position.x + (r * 12 - 6),
        y: boss.data.position.y + (r * 12 - 6),
      };
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
    const enemy = new Enemy2D(waypoints, type, createId('enemy'), hpMultiplier, pathIndex);
    this.enemies.push(enemy);
  }

  public getEnemies(): Enemy2D[] {
    return this.enemies;
  }
}
