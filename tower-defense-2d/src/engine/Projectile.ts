import type { IEnemy2D, TowerType, Vector2D } from '../types';
import { AnalyticsManager } from './AnalyticsManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { handleTowerDamageDealt, Tower2D } from './Tower';
import type { GameState } from './GameState';
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
   * 0..1 — quanto da armadura do alvo este disparo ignora (repassado a
   * `Enemy2D.takeDamage`). Antes era um booleano `isLightShot` inferido da cor
   * do projétil, acoplamento que quebraria ao dar cor própria a uma especialização.
   */
  public armorPenetration: number;
  public sourceTower?: Tower2D;

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
    armorPenetration = 0,
    sourceTower?: Tower2D
  ) {
    this.sourceTower = sourceTower;
    this.armorPenetration = armorPenetration;
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

  public update(allEnemies: Enemy2D[], fxManager: FXManager, analyticsManager?: AnalyticsManager, gameState?: GameState): boolean {
    if (this.target.isDead) return true;

    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.hypot(dx, dy);

    if (distance < this.speed) {
      const targetEnemy = allEnemies.find(e => e.data === this.target);

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
            // Alvo primário do projétil é um tiro mirado: sofre a penetração
            // própria do disparo (this.armorPenetration) e pode esquivar. Só ele
            // é identificado por referência (`this.target`) porque é o único
            // enemy.data que o projétil perseguia antes de explodir.
            // Vítimas secundárias do respingo (todo o resto no raio) são dano em
            // área: ignoram armadura (1) e nunca esquivam (false) — decisão de
            // design para o estilhaço, não um efeito colateral do impacto direto.
            const isPrimaryTarget = enemy.data === this.target;
            const dmgDealt = isPrimaryTarget
              ? enemy.takeDamage(this.damage, this.armorPenetration, true)
              : enemy.takeDamage(this.damage, 1, false);
            if (dmgDealt > 0) {
              fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, `-${dmgDealt}`, '#ff5252');
              if (analyticsManager && this.towerType) {
                analyticsManager.recordDamage(this.towerType, dmgDealt);
              }
              if (this.sourceTower && gameState) {
                handleTowerDamageDealt(this.sourceTower, enemy, dmgDealt, gameState, allEnemies);
              }
            } else if (dmgDealt === -1) {
              fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, 'DODGED!', '#ff9800');
            }
          }
        }
      } else if (targetEnemy) {
        // Single Target Hit with Armor & Dodge calculation
        const dmgDealt = targetEnemy.takeDamage(this.damage, this.armorPenetration);

        if (dmgDealt === -1) {
          fxManager.addDamageText(this.target.position.x, this.target.position.y, 'DODGED!', '#ff9800');
        } else if (dmgDealt > 0) {
          const txt = this.isCrit ? `💥 CRIT! -${dmgDealt}` : `-${dmgDealt}`;
          const col = this.isCrit ? '#ffea00' : '#ffffff';
          fxManager.addDamageText(this.target.position.x, this.target.position.y, txt, col);
          if (analyticsManager && this.towerType) {
            analyticsManager.recordDamage(this.towerType, dmgDealt);
          }
          if (this.sourceTower && gameState && targetEnemy) {
            handleTowerDamageDealt(this.sourceTower, targetEnemy, dmgDealt, gameState, allEnemies);
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
