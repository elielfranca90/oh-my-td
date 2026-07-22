import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { GameState } from './GameState';

export type ActiveSpell = 'METEOR' | 'FREEZE' | null;

export class SpellManager {
  private gameState: GameState;
  private fxManager: FXManager;

  public activeSpell: ActiveSpell = null;

  // Cooldown timers in ms
  public meteorCooldownMs = 0;
  public freezeCooldownMs = 0;

  public readonly METEOR_MAX_COOLDOWN = 15000; // 15s
  public readonly FREEZE_MAX_COOLDOWN = 20000; // 20s

  public readonly METEOR_COST = 50;
  public readonly FREEZE_COST = 40;

  constructor(gameState: GameState, fxManager: FXManager) {
    this.gameState = gameState;
    this.fxManager = fxManager;
  }

  public selectSpell(spell: ActiveSpell) {
    if (this.activeSpell === spell) {
      this.activeSpell = null; // Toggle off
    } else {
      this.activeSpell = spell;
    }
  }

  public update(deltaTimeMs: number) {
    if (this.meteorCooldownMs > 0) {
      this.meteorCooldownMs = Math.max(0, this.meteorCooldownMs - deltaTimeMs);
    }
    if (this.freezeCooldownMs > 0) {
      this.freezeCooldownMs = Math.max(0, this.freezeCooldownMs - deltaTimeMs);
    }
  }

  public triggerGlobalFreeze(allEnemies: Enemy2D[]): boolean {
    if (this.freezeCooldownMs > 0) return false;
    if (!this.gameState.spendGold(this.FREEZE_COST)) return false;

    this.freezeCooldownMs = this.FREEZE_MAX_COOLDOWN;
    this.fxManager.triggerScreenShake(10);

    for (const enemy of allEnemies) {
      if (!enemy.data.isDead) {
        enemy.applyFreeze(210); // 3.5s
        this.fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, 'FROZEN!', '#00e5ff');
      }
    }
    return true;
  }

  public castMeteorAt(x: number, y: number, allEnemies: Enemy2D[]): boolean {
    if (this.meteorCooldownMs > 0) return false;
    if (!this.gameState.spendGold(this.METEOR_COST)) return false;

    this.meteorCooldownMs = this.METEOR_MAX_COOLDOWN;
    this.activeSpell = null; // Reset spell cursor

    this.fxManager.triggerScreenShake(14);
    this.fxManager.addDamageText(x, y - 20, '💥 METEOR IMPACT!', '#ff3d00');

    const radius = 90;
    const damage = 90;

    for (const enemy of allEnemies) {
      if (enemy.data.isDead) continue;
      const dist = Math.hypot(enemy.data.position.x - x, enemy.data.position.y - y);
      if (dist <= radius) {
        enemy.data.hp -= damage;
        this.fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, `-${damage}`, '#ff3d00');
        if (enemy.data.hp <= 0) {
          enemy.data.isDead = true;
        }
      }
    }
    return true;
  }

  public renderSpellTargeting(ctx: CanvasRenderingContext2D, mousePos: { x: number; y: number } | null) {
    if (!this.activeSpell || !mousePos) return;

    if (this.activeSpell === 'METEOR') {
      const radius = 90;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 61, 0, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#ff3d00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshair
      ctx.beginPath();
      ctx.moveTo(mousePos.x - 15, mousePos.y);
      ctx.lineTo(mousePos.x + 15, mousePos.y);
      ctx.moveTo(mousePos.x, mousePos.y - 15);
      ctx.lineTo(mousePos.x, mousePos.y + 15);
      ctx.strokeStyle = '#ff3d00';
      ctx.stroke();
    }
  }
}
