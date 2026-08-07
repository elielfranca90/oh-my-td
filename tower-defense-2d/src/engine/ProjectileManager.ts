import type { IEnemy2D, Vector2D } from '../types';
import { AnalyticsManager } from './AnalyticsManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { Projectile2D, type ProjectileOptions } from './Projectile';

export class ProjectileManager2D {
  private projectiles: Projectile2D[] = [];

  public fire(startPos: Vector2D, target: IEnemy2D, damage: number, options: ProjectileOptions = {}) {
    this.projectiles.push(new Projectile2D(startPos, target, damage, options));
  }

  public update(allEnemies: Enemy2D[], fxManager: FXManager, analyticsManager?: AnalyticsManager) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const hit = this.projectiles[i].update(allEnemies, fxManager, analyticsManager);
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
