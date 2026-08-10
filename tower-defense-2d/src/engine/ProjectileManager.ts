import type { IEnemy2D, TowerType, Vector2D } from '../types';
import { AnalyticsManager } from './AnalyticsManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { Projectile2D } from './Projectile';
import type { Tower2D } from './Tower';
import type { GameState } from './GameState';

export class ProjectileManager2D {
  private projectiles: Projectile2D[] = [];

  public fire(
    startPos: Vector2D,
    target: IEnemy2D,
    damage: number,
    color?: string,
    speed?: number,
    radius?: number,
    splashRadius?: number,
    slowFactor?: number,
    isCrit?: boolean,
    towerType?: TowerType,
    armorPenetration?: number,
    sourceTower?: Tower2D
  ) {
    this.projectiles.push(
      new Projectile2D(
        startPos,
        target,
        damage,
        color,
        speed,
        radius,
        splashRadius,
        slowFactor,
        isCrit,
        towerType,
        armorPenetration,
        sourceTower
      )
    );
  }

  public update(allEnemies: Enemy2D[], fxManager: FXManager, analyticsManager?: AnalyticsManager, gameState?: GameState) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const hit = this.projectiles[i].update(allEnemies, fxManager, analyticsManager, gameState);
      if (hit) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      p.render(ctx);
    }
  }
}
