import { EventBus } from './EventBus';

import { AchievementManager } from './AchievementManager';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { GameState } from './GameState';
import { ParticleManager } from './ParticleManager';
import { TalentManager } from './TalentManager';

export type ActiveSpell = 'METEOR' | 'FREEZE' | null;

export class SpellManager {
  private gameState: GameState;
  private fxManager: FXManager;
  private audioManager: AudioManager;
  private particleManager: ParticleManager;
  private talentManager?: TalentManager;
  private achievementManager?: AchievementManager;

  public activeSpell: ActiveSpell = null;

  // Cooldown timers in ms (Doubled)
  public meteorCooldownMs = 0;
  public freezeCooldownMs = 0;

  public METEOR_MAX_COOLDOWN = 30000; // 30s base
  public FREEZE_MAX_COOLDOWN = 40000; // 40s base

  // Dynamic Costs (Initial tripled)
  public meteorCost = 150; // Initial 150g
  public freezeCost = 120; // Initial 120g

  constructor(
    gameState: GameState,
    fxManager: FXManager,
    audioManager: AudioManager,
    particleManager: ParticleManager,
    talentManager?: TalentManager,
    achievementManager?: AchievementManager
  ) {
    this.gameState = gameState;
    this.fxManager = fxManager;
    this.audioManager = audioManager;
    this.particleManager = particleManager;
    this.talentManager = talentManager;
    this.achievementManager = achievementManager;

    if (this.talentManager) {
      const cdReduction = this.talentManager.getSpellCdReduction();
      this.METEOR_MAX_COOLDOWN = Math.round(30000 * (1 - cdReduction));
      this.FREEZE_MAX_COOLDOWN = Math.round(40000 * (1 - cdReduction));
    }
  }

  public selectSpell(spell: ActiveSpell) {
    if (this.gameState.challengeMode === 'MORTE_CERTA') {
      this.activeSpell = null;
      EventBus.getInstance().emit('spell:select', null);
      return;
    }
    if (this.activeSpell === spell) {
      this.activeSpell = null; // Toggle off
    } else {
      this.activeSpell = spell;
    }
    EventBus.getInstance().emit('spell:select', this.activeSpell);
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
    if (this.gameState.challengeMode === 'MORTE_CERTA') return false;
    if (this.freezeCooldownMs > 0) return false;
    if (!this.gameState.spendGold(this.freezeCost)) return false;
    this.freezeCooldownMs = this.FREEZE_MAX_COOLDOWN;
    this.fxManager.triggerScreenShake(10);
    this.audioManager.playFreeze();
    this.particleManager.triggerFreezeEffect();

    if (this.achievementManager) {
      this.achievementManager.addProgress('GLOBAL_FREEZE', 1);
    }

    for (const enemy of allEnemies) {
      if (!enemy.data.isDead) {
        enemy.applyFreeze(210); // 3.5s
        this.fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, 'FROZEN!', '#00e5ff');
      }
    }

    // Double the cost after usage
    this.freezeCost *= 2;
    EventBus.getInstance().emit('spell:cast', { spell: 'FREEZE', cost: this.freezeCost, cd: this.freezeCooldownMs });
    return true;
  }

  public castMeteorAt(x: number, y: number, allEnemies: Enemy2D[]): boolean {
    if (this.gameState.challengeMode === 'MORTE_CERTA') return false;
    if (this.meteorCooldownMs > 0) return false;
    if (!this.gameState.spendGold(this.meteorCost)) return false;

    this.meteorCooldownMs = this.METEOR_MAX_COOLDOWN;
    this.activeSpell = null; // Reset spell cursor
    EventBus.getInstance().emit('spell:select', null);
    EventBus.getInstance().emit('spell:cast', { spell: 'METEOR', cost: this.meteorCost, cd: this.meteorCooldownMs });

    if (this.achievementManager) {
      this.achievementManager.addProgress('METEOR_STRIKE', 1);
    }

    // Animated Meteor Descent
    this.particleManager.spawnMeteor(x, y, () => {
      this.fxManager.triggerScreenShake(16);
      this.audioManager.playMeteor();
      this.fxManager.addDamageText(x, y - 20, '💥 METEOR IMPACT!', '#ff3d00');

      const radius = 90;
      const damage = 90;

      for (const enemy of allEnemies) {
        if (enemy.data.isDead) continue;
        const dist = Math.hypot(enemy.data.position.x - x, enemy.data.position.y - y);
        if (dist <= radius) {
          enemy.takeDamage(damage, false);
          this.fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, `-${damage}`, '#ff3d00');
          if (enemy.data.hp <= 0) {
            enemy.data.isDead = true;
          }
        }
      }
    });

    // Double the cost after usage
    this.meteorCost *= 2;
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
