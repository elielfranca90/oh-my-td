import type { IEnemy2D, TowerType, Vector2D } from '../types';
import { AnalyticsManager } from './AnalyticsManager';
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
  public isCrit?: boolean;
  public towerType?: TowerType;
  /**
   * Se o disparo sofre o armorFactor do alvo. Antes era inferido da cor do
   * projétil, acoplamento que quebraria ao dar cor própria a uma especialização.
   */
  public isLightShot: boolean;

  constructor(
    startPos: Vector2D,
    target: IEnemy2D,
    damage: number,
    color = '#ffeb3b',
    speed = 8,
    radius = 5,
    splashRadius?: number,
    slowFactor?: number,
    isCrit?: boolean,
    towerType?: TowerType,
    isLightShot = false
  ) {
    this.isLightShot = isLightShot;
    this.position = { ...startPos };
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.speed = speed;
    this.radius = radius;
    this.splashRadius = splashRadius;
    this.slowFactor = slowFactor;
    this.isCrit = isCrit;
    this.towerType = towerType;
  }

  public update(allEnemies: Enemy2D[], fxManager: FXManager, analyticsManager?: AnalyticsManager): boolean {
    if (this.target.isDead) return true;

    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.hypot(dx, dy);

    if (distance < this.speed) {
      const targetEnemy = allEnemies.find(e => e.data === this.target);
      const isLightShot = this.isLightShot;

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
            const dmgDealt = enemy.takeDamage(this.damage, false);
            if (dmgDealt > 0) {
              fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, `-${dmgDealt}`, '#ff5252');
              if (analyticsManager && this.towerType) {
                analyticsManager.recordDamage(this.towerType, dmgDealt);
              }
            } else if (dmgDealt === -1) {
              fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, 'DODGED!', '#ff9800');
            }
          }
        }
      } else if (targetEnemy) {
        // Single Target Hit with Armor & Dodge calculation
        const dmgDealt = targetEnemy.takeDamage(this.damage, isLightShot);

        if (dmgDealt === -1) {
          fxManager.addDamageText(this.target.position.x, this.target.position.y, 'DODGED!', '#ff9800');
        } else if (dmgDealt > 0) {
          const txt = this.isCrit ? `💥 CRIT! -${dmgDealt}` : `-${dmgDealt}`;
          const col = this.isCrit ? '#ffea00' : '#ffffff';
          fxManager.addDamageText(this.target.position.x, this.target.position.y, txt, col);
          if (analyticsManager && this.towerType) {
            analyticsManager.recordDamage(this.towerType, dmgDealt);
          }
        }

        // Apply Slow (Frost Tower)
        if (this.slowFactor) {
          targetEnemy.applySlow(this.slowFactor, 120);
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
