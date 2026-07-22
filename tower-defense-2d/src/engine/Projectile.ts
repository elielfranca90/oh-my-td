import type { IEnemy2D, Vector2D } from '../types';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';

export class Projectile2D {
  public position: Vector2D;
  public target: IEnemy2D;
  public speed: number;
  public damage: number;
  public color: string;
  public radius: number;
  public splashRadius?: number;
  public slowFactor?: number;

  constructor(
    startPos: Vector2D,
    target: IEnemy2D,
    damage: number,
    color = '#ffeb3b',
    speed = 8,
    radius = 5,
    splashRadius?: number,
    slowFactor?: number
  ) {
    this.position = { ...startPos };
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.speed = speed;
    this.radius = radius;
    this.splashRadius = splashRadius;
    this.slowFactor = slowFactor;
  }

  public update(allEnemies: Enemy2D[], fxManager: FXManager): boolean {
    if (this.target.isDead) return true;

    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.hypot(dx, dy);

    if (distance < this.speed) {
      // 1. AoE Splash Damage (Artillery)
      if (this.splashRadius && this.splashRadius > 0) {
        fxManager.triggerScreenShake(3);
        for (const enemy of allEnemies) {
          if (enemy.data.isDead) continue;
          const distToImpact = Math.hypot(
            enemy.data.position.x - this.position.x,
            enemy.data.position.y - this.position.y
          );
          if (distToImpact <= this.splashRadius) {
            enemy.data.hp -= this.damage;
            fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, `-${this.damage}`, '#ff5252');
            if (enemy.data.hp <= 0) enemy.data.isDead = true;
          }
        }
      } else {
        // Single Target Hit
        this.target.hp -= this.damage;
        fxManager.addDamageText(this.target.position.x, this.target.position.y, `-${this.damage}`, '#ffeb3b');

        // Apply Slow (Frost Tower)
        if (this.slowFactor) {
          const targetEnemy = allEnemies.find(e => e.data === this.target);
          if (targetEnemy) {
            targetEnemy.applySlow(this.slowFactor, 120); // 2 sec slow
          }
        }

        if (this.target.hp <= 0) {
          this.target.isDead = true;
        }
      }
      return true; // Hit target
    }

    this.position.x += (dx / distance) * this.speed;
    this.position.y += (dy / distance) * this.speed;
    return false;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
