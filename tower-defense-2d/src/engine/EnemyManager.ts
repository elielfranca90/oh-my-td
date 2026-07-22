import type { EnemyType, Vector2D } from '../types';

import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { GameState } from './GameState';
import { WaveManager } from './WaveManager';

export class EnemyManager2D {
  private enemies: Enemy2D[] = [];
  private waypoints: Vector2D[];
  private gameState: GameState;
  private waveManager: WaveManager;
  private audioManager: AudioManager;

  constructor(
    waypoints: Vector2D[],
    gameState: GameState,
    waveManager: WaveManager,
    audioManager: AudioManager
  ) {
    this.waypoints = waypoints;
    this.gameState = gameState;
    this.waveManager = waveManager;
    this.audioManager = audioManager;
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
        this.enemies.splice(i, 1);
        continue;
      }

      const reachedBase = enemy.update(this.waypoints);
      if (reachedBase) {
        this.gameState.takeDamage(enemy.baseDamage);
        this.audioManager.playBaseDamage();
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

  private spawnEnemy(type: EnemyType, hpMultiplier = 1.0) {
    if (type === 'BOSS') {
      this.audioManager.playBossAlert();
    }
    const enemy = new Enemy2D(this.waypoints, type, `enemy-${Date.now()}-${Math.random()}`, hpMultiplier);
    this.enemies.push(enemy);
  }

  public getEnemies(): Enemy2D[] {
    return this.enemies;
  }
}
