import { Tower2D } from './Tower';

import type { EnemyType } from '../types';

import { AchievementManager } from './AchievementManager';
import { AnalyticsManager } from './AnalyticsManager';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { GameState } from './GameState';
import { MapManager2D } from './MapManager';
import { Rng } from './Rng';
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
  private rng: Rng;
  /** Contador de IDs: `enemy-${Date.now()}-${Math.random()}` não era reproduzível. */
  private nextEnemyId = 1;

  constructor(
    mapManager: MapManager2D,
    gameState: GameState,
    waveManager: WaveManager,
    audioManager: AudioManager,
    analyticsManager?: AnalyticsManager,
    achievementManager?: AchievementManager,
    rng?: Rng
  ) {
    this.mapManager = mapManager;
    this.gameState = gameState;
    this.waveManager = waveManager;
    this.audioManager = audioManager;
    this.analyticsManager = analyticsManager;
    this.achievementManager = achievementManager;
    this.rng = rng || new Rng(Date.now());
  }

  private attackTimer = 0;

  public update(deltaTimeMs: number, towers: Tower2D[] = []) {
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

        if (this.achievementManager) {
          this.achievementManager.addProgress('FIRST_BLOOD', 1);
          if (enemy.data.type === 'RUNNER') this.achievementManager.addProgress('RUNNER_HUNTER', 1);
          if (enemy.data.type === 'SHIELDED' || enemy.data.maxShieldHp > 0) this.achievementManager.addProgress('SHIELD_BREAKER', 1);
          if (enemy.data.type === 'BOSS' || enemy.data.type === 'BLACK_MEGA_BOSS') this.achievementManager.addProgress('BOSS_SLAYER', 1);
          if (enemy.data.type === 'BLACK_MEGA_BOSS') this.achievementManager.addProgress('BLACK_BOSS_VANQUISHER', 1);
        }

        // Boss Death Reinforcements: Spawn 2 Runners!
        if (enemy.data.type === 'BOSS') {
          this.spawnReinforcements(enemy);
        }

        this.enemies.splice(i, 1);
        continue;
      }

      const waypoints = this.mapManager.getWaypoints(enemy.pathIndex);
      // Só o Moss Giant regenera, então evita a varredura de vizinhos para o resto.
      const isNearFoliage =
        enemy.data.type === 'MOSS_GIANT' &&
        this.mapManager.isNearFoliage(enemy.data.position.x, enemy.data.position.y);
      const reachedBase = enemy.update(waypoints, isNearFoliage);
      if (reachedBase) {
        this.gameState.takeDamage(enemy.baseDamage);
        this.audioManager.playBaseDamage();
        this.enemies.splice(i, 1);
      }
    }

    // 3. Boss Attack on Nearby Towers
    this.attackTimer += deltaTimeMs;
    if (this.attackTimer >= 1000) {
      this.attackTimer = 0;
      for (const enemy of this.enemies) {
        if (!enemy.data.isDead && (enemy.data.type === 'BLACK_MEGA_BOSS' || enemy.data.type === 'BOSS')) {
          const attackPower = enemy.data.type === 'BLACK_MEGA_BOSS' ? 15 : 12;
          const attackRange = enemy.data.type === 'BLACK_MEGA_BOSS' ? 120 : 100;

          for (const tower of towers) {
            if (!tower.data.isDestroyed) {
              const dx = tower.data.position.x - enemy.data.position.x;
              const dy = tower.data.position.y - enemy.data.position.y;
              if (Math.hypot(dx, dy) <= attackRange) {
                const destroyed = tower.takeDamage(attackPower);
                if (destroyed) {
                  this.audioManager.playBaseDamage();
                }
              }
            }
          }
        }
      }
    }

    // 4. Check wave completion
    this.waveManager.onEnemyCleared(this.enemies.length);
  }

  private spawnReinforcements(boss: Enemy2D) {
    const waypoints = this.mapManager.getWaypoints(boss.pathIndex);
    const clampedIndex = Math.max(0, Math.min(waypoints.length - 1, boss.data.waypointIndex));
    for (let r = 0; r < 2; r++) {
      const runner = new Enemy2D(
        waypoints,
        'RUNNER',
        `runner-boss-${this.nextEnemyId++}`,
        1.0,
        boss.pathIndex,
        1.0,
        1.0,
        this.rng
      );
      runner.data.waypointIndex = clampedIndex;
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
    if (type === 'BOSS' || type === 'BLACK_MEGA_BOSS') {
      this.audioManager.playBossAlert();
    }

    // Determine path index (0 = Left, 1 = Right for Map 2 Dual Spawn)
    let pathIndex = 0;
    if (this.mapManager.currentMapId === 'MAP_2') {
      this.spawnToggle = !this.spawnToggle;
      pathIndex = this.spawnToggle ? 1 : 0;
    }

    const waypoints = this.mapManager.getWaypoints(pathIndex);
    const isFast = this.gameState.challengeMode === 'MORTE_CERTA';
    const isTurbo = this.gameState.challengeMode === 'MORTE_CERTA';
    const speedMultiplier = isFast ? 1.4 : 1.0;
    const currentWaveNum = this.waveManager.currentWaveIndex + 1;
    let goldMultiplier = isTurbo ? 1.5 : 1.0;
    if (currentWaveNum >= 4) {
      goldMultiplier *= 0.75;
    }

    const enemy = new Enemy2D(
      waypoints,
      type,
      `enemy-${this.nextEnemyId++}`,
      hpMultiplier,
      pathIndex,
      speedMultiplier,
      goldMultiplier,
      this.rng
    );
    this.enemies.push(enemy);
  }

  public getEnemies(): Enemy2D[] {
    return this.enemies;
  }
}
