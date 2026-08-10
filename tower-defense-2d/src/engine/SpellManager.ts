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

  /** Custo-base de cada magia — usado pelo decaimento do §5.4 (P1_BALANCE_SPEC.md). */
  private static readonly METEOR_BASE_COST = 150;
  private static readonly FREEZE_BASE_COST = 120;

  /**
   * Decaimento de custo por ondas sem uso (Entrega 5, §5.4). `costStep` é o
   * expoente de `baseCost * 2^costStep` — a mesma progressão de dobrar por uso
   * de sempre, só que agora reversível: cada 2 ondas completadas sem conjurar
   * a magia devolve 1 passo, com teto em 6 (custo máximo 64x o base) para que
   * o "sem garantia de teto" apontado pela auditoria não vire escalada sem fim.
   * Estado independente por magia — Congelamento não compartilha step com Meteoro.
   */
  private meteorCostStep = 0;
  private meteorWavesSinceLastCast = 0;
  private freezeCostStep = 0;
  private freezeWavesSinceLastCast = 0;

  // Custo dinâmico: derivado do baseCost e do costStep (nunca escrito direto).
  public get meteorCost(): number {
    return SpellManager.METEOR_BASE_COST * Math.pow(2, this.meteorCostStep);
  }

  public get freezeCost(): number {
    return SpellManager.FREEZE_BASE_COST * Math.pow(2, this.freezeCostStep);
  }

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

    // Avança 1 passo no decaimento (§5.4) — teto em 6 (custo máx. 64x o base).
    this.freezeCostStep = Math.min(6, this.freezeCostStep + 1);
    this.freezeWavesSinceLastCast = 0;
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

      for (const enemy of allEnemies) {
        if (enemy.data.isDead) continue;
        const dist = Math.hypot(enemy.data.position.x - x, enemy.data.position.y - y);
        if (dist <= radius) {
          // Dano proporcional ao HP MÁXIMO do alvo (não o atual — ver §5.1: o
          // Meteoro não deve variar se o alvo já estiver ferido, senão incentiva
          // "guardar" a magia para finalizar em vez de abrir combate com ela).
          // Calculado por inimigo, dentro do laço: cada alvo recebe seu próprio dano.
          const damage = Math.round(90 + 0.12 * enemy.data.maxHp);
          // Magia em área: ignora armadura e não é esquivável.
          enemy.takeDamage(damage, 1, false);
          this.fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, `-${damage}`, '#ff3d00');
          if (enemy.data.hp <= 0) {
            enemy.data.isDead = true;
          }
        }
      }
    });

    // Avança 1 passo no decaimento (§5.4) — teto em 6 (custo máx. 64x o base).
    this.meteorCostStep = Math.min(6, this.meteorCostStep + 1);
    this.meteorWavesSinceLastCast = 0;
    return true;
  }

  /**
   * Decaimento de custo por ondas sem uso (§5.4). `Game.ts` assina `wave:end`
   * do EventBus (emitido por `WaveManager.onEnemyCleared()`) e chama este
   * método uma vez por onda concluída — sem parâmetros porque cada magia só
   * precisa contar "quantas ondas se passaram desde o último cast", não o
   * número da onda em si.
   */
  public onWaveCompleted(): void {
    this.meteorWavesSinceLastCast++;
    if (this.meteorWavesSinceLastCast > 0 && this.meteorWavesSinceLastCast % 2 === 0) {
      this.meteorCostStep = Math.max(0, this.meteorCostStep - 1);
    }

    this.freezeWavesSinceLastCast++;
    if (this.freezeWavesSinceLastCast > 0 && this.freezeWavesSinceLastCast % 2 === 0) {
      this.freezeCostStep = Math.max(0, this.freezeCostStep - 1);
    }
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
