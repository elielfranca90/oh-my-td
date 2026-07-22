import type { EnemyType, Vector2D } from '../types';

import { Enemy2D } from './Enemy';
import { GameState } from './GameState';
import { WaveManager } from './WaveManager';

export class EnemyManager2D {
  private enemies: Enemy2D[] = [];
  private waypoints: Vector2D[];
  private gameState: GameState;
  private waveManager: WaveManager;

  constructor(waypoints: Vector2D[], gameState: GameState, waveManager: WaveManager) {
    this.waypoints = waypoints;
    this.gameState = gameState;
    this.waveManager = waveManager;
  }

  public update(deltaTimeMs: number) {
    // 1. Spawn from wave manager
    const typeToSpawn = this.waveManager.getNextEnemyToSpawn(deltaTimeMs);
    if (typeToSpawn) {
      this.spawnEnemy(typeToSpawn);
    }

    // 2. Update existing enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.data.isDead) {
        this.gameState.addGold(enemy.data.goldReward);
        this.enemies.splice(i, 1);
        continue;
      }

      const reachedBase = enemy.update(this.waypoints);
      if (reachedBase) {
        this.gameState.takeDamage(enemy.baseDamage);
        this.enemies.splice(i, 1);
      }
    }

    // 3. Check wave completion
    this.waveManager.onEnemyCleared(this.enemies.length);
  }

  public render(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }
  }

  private spawnEnemy(type: EnemyType) {
    const enemy = new Enemy2D(this.waypoints, type, `enemy-${Date.now()}-${Math.random()}`);
    this.enemies.push(enemy);
  }

  public getEnemies(): Enemy2D[] {
    return this.enemies;
  }
}
