import type { IEnemy2D, TowerType, Vector2D } from '../types';
import { AnalyticsManager } from './AnalyticsManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';

export interface ProjectileOptions {
  color?: string;
  speed?: number;
  radius?: number;
  splashRadius?: number;
  isCrit?: boolean;
  towerType?: TowerType;
  /** Fired at the real impact position — used by Artillery to place its napalm patch. */
  onImpact?: (x: number, y: number) => void;
}

export class Projectile2D {
  public position: Vector2D;
  public target: IEnemy2D;
  public speed: number;
  public damage: number;
  public color: string;
  public radius: number;
  public splashRadius?: number;
  public isCrit?: boolean;
  public towerType?: TowerType;
  private onImpact?: (x: number, y: number) => void;

  constructor(startPos: Vector2D, target: IEnemy2D, damage: number, options: ProjectileOptions = {}) {
    this.position = { ...startPos };
    this.target = target;
    this.damage = damage;
    this.color = options.color ?? '#ffeb3b';
    this.speed = options.speed ?? 8;
    this.radius = options.radius ?? 5;
    this.splashRadius = options.splashRadius;
    this.isCrit = options.isCrit;
    this.towerType = options.towerType;
    this.onImpact = options.onImpact;
  }

  public update(allEnemies: Enemy2D[], fxManager: FXManager, analyticsManager?: AnalyticsManager): boolean {
    if (this.target.isDead) return true;

    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.hypot(dx, dy);

    if (distance < this.speed) {
      const targetEnemy = allEnemies.find(e => e.data === this.target);
      // Armor mitigation applies to the Basic tower's light bullets. This used to be
      // inferred from the projectile colour, which broke as soon as a colour changed.
      const isLightShot = this.towerType === 'BASIC';

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
      }

      // Effects anchored to where the shell actually landed.
      if (this.onImpact) {
        this.onImpact(this.position.x, this.position.y);
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
