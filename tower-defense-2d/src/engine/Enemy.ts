import { MegaBossSpriteRenderer } from './MegaBossSpriteRenderer';
import { Rng } from './Rng';
import { SpriteManager } from './SpriteManager';

import type { EnemyType, IEnemy2D, Vector2D } from '../types';

export class Enemy2D {
  public data: IEnemy2D;
  public baseDamage: number;
  public pathIndex: number;
  /** Ligado enquanto o MOSS_GIANT se cura junto à mata; lido apenas pelo render. */
  public isRegenerating = false;
  private hasTriggeredSpore = false;
  private mossRegenTimer = 0;
  private rng: Rng;

  constructor(
    waypoints: Vector2D[],
    type: EnemyType,
    id: string,
    hpMultiplier = 1.0,
    pathIndex = 0,
    speedMultiplier = 1.0,
    goldMultiplier = 1.0,
    rng?: Rng
  ) {
    // Sem RNG injetado cai numa semente de relógio: comportamento idêntico ao
    // anterior para quem constrói o inimigo solto (testes, spawn avulso).
    this.rng = rng || new Rng(Date.now());
    const config = this.getEnemyConfig(type);
    this.baseDamage = config.baseDamage;
    this.pathIndex = pathIndex;

    const scaledHp = Math.round(config.hp * hpMultiplier);
    const scaledShield = Math.round(config.shield * hpMultiplier);
    const scaledReward = Math.round(config.reward * Math.pow(hpMultiplier, 0.4) * goldMultiplier);

    this.data = {
      id,
      type,
      hp: scaledHp,
      maxHp: scaledHp,
      shieldHp: scaledShield,
      maxShieldHp: scaledShield,
      speed: Number((config.speed * speedMultiplier).toFixed(2)),
      goldReward: scaledReward,
      waypointIndex: 0,
      pathIndex,
      position: { ...waypoints[0] },
      isDead: false,
      radius: config.radius,
      color: config.color,
      armorFactor: config.armorFactor,
      dodgeChance: config.dodgeChance,
      slowTimer: 0,
      slowFactor: 1,
      freezeTimer: 0,
      sporeBoostTimer: 0,
    };
  }

  private getEnemyConfig(type: EnemyType) {
    switch (type) {
      case 'RUNNER':
        return { hp: 6, shield: 0, speed: 3.6, radius: 11, reward: 8, color: '#ff9800', baseDamage: 1, armorFactor: 1.0, dodgeChance: 0.25 };
      case 'TANK':
        return { hp: 35, shield: 0, speed: 1.1, radius: 20, reward: 25, color: '#8e24aa', baseDamage: 2, armorFactor: 0.6, dodgeChance: 0.0 };
      case 'SHIELDED':
        return { hp: 14, shield: 22, speed: 2.2, radius: 14, reward: 18, color: '#0288d1', baseDamage: 1, armorFactor: 0.9, dodgeChance: 0.0 };
      case 'SPORE_SPRINTER':
        return { hp: 10, shield: 0, speed: 2.4, radius: 13, reward: 12, color: '#7cb342', baseDamage: 1, armorFactor: 1.0, dodgeChance: 0.0 };
      case 'MOSS_GIANT':
        return { hp: 45, shield: 0, speed: 1.0, radius: 22, reward: 30, color: '#33691e', baseDamage: 3, armorFactor: 0.7, dodgeChance: 0.0 };
      case 'BOSS':
        return { hp: 160, shield: 0, speed: 0.8, radius: 26, reward: 100, color: '#d50000', baseDamage: 5, armorFactor: 0.8, dodgeChance: 0.0 };
      case 'BLACK_MEGA_BOSS':
        return { hp: 380, shield: 90, speed: 0.55, radius: 32, reward: 300, color: '#11111a', baseDamage: 10, armorFactor: 0.45, dodgeChance: 0.0 };
      default:
        return { hp: 10, shield: 0, speed: 2.0, radius: 15, reward: 10, color: '#e53935', baseDamage: 1, armorFactor: 1.0, dodgeChance: 0.0 };
    }
  }

  /**
   * @param armorPenetration 0..1 — quanto da armadura o disparo ignora. `0` (padrão)
   *   é o caso comum: a armadura vale inteira. `1` é bypass total (ex.: PIERCING).
   *   Fórmula: efetivo = armorFactor + (1 - armorFactor) * penetração — com
   *   penetração 0 o efetivo é o próprio armorFactor; com 1, vira 1 (sem redução).
   *   Antes só tiros "isLightShot" sofriam armadura, o que a apagava para
   *   Canhão/Artilharia/Prisma Solar; agora ela vale sempre e cada torre decide
   *   quanto perfura.
   * @param isAvoidable false pula o teste de esquiva do Runner. Dano em área,
   *   DoT e hazards ambientais atingem todo mundo no raio — deixá-los esquivar
   *   é ilegível (o jogador vê "DODGED!" dentro de uma explosão).
   */
  public takeDamage(amount: number, armorPenetration = 0, isAvoidable = true): number {
    // 1. Check Dodge (Runner) — só quando o dano é evitável.
    if (isAvoidable && this.data.dodgeChance > 0 && this.rng.chance(this.data.dodgeChance)) {
      return -1; // Dodged!
    }

    // 2. Apply Armor Factor, atenuado pela penetração do disparo.
    const effectiveArmor = this.data.armorFactor + (1 - this.data.armorFactor) * armorPenetration;
    const actualDamage = Math.max(1, Math.round(amount * effectiveArmor));

    // 3. Shield absorption (Shielded Speeder)
    if (this.data.shieldHp > 0) {
      if (this.data.shieldHp >= actualDamage) {
        this.data.shieldHp -= actualDamage;
        return actualDamage;
      } else {
        const remainingDamage = actualDamage - this.data.shieldHp;
        this.data.shieldHp = 0;
        this.data.hp = Math.max(0, this.data.hp - remainingDamage);
        if (this.data.hp <= 0) this.data.isDead = true;
        return actualDamage;
      }
    }

    // 4. HP Damage
    this.data.hp = Math.max(0, this.data.hp - actualDamage);
    if (this.data.hp <= 0) this.data.isDead = true;

    return actualDamage;
  }

  public shouldTriggerSporeCloud(): boolean {
    if (this.data.type === 'SPORE_SPRINTER' && !this.hasTriggeredSpore && this.data.hp <= this.data.maxHp * 0.5) {
      this.hasTriggeredSpore = true;
      return true;
    }
    return false;
  }

  public applySlow(factor: number, durationFrames = 120) {
    this.data.slowFactor = Math.min(this.data.slowFactor, factor);
    this.data.slowTimer = Math.max(this.data.slowTimer, durationFrames);
  }

  public applyFreeze(durationFrames = 210) {
    this.data.freezeTimer = Math.max(this.data.freezeTimer, durationFrames);
  }

  public applySporeBoost(durationFrames = 180) {
    this.data.sporeBoostTimer = Math.max(this.data.sporeBoostTimer || 0, durationFrames);
  }

  public update(waypoints: Vector2D[], isNearFoliage = false): boolean {
    // A animação do mega boss é avançada pelo Game2D (passo de apresentação):
    // fazê-lo aqui acelerava o sprite quando havia mais de um boss em tela.
    this.isRegenerating =
      this.data.type === 'MOSS_GIANT' && isNearFoliage && this.data.hp < this.data.maxHp;
    if (this.isRegenerating) {
      this.mossRegenTimer++;
      if (this.mossRegenTimer >= 20) {
        // Regenera ~1.5% do HP máximo por segundo (~0.5% a cada 20 frames / ~0.33s), mínimo 1 HP.
        const regenAmount = Math.max(1, Math.round(this.data.maxHp * 0.005));
        this.data.hp = Math.min(this.data.maxHp, this.data.hp + regenAmount);
        this.mossRegenTimer = 0;
      }
    } else {
      this.mossRegenTimer = 0;
    }

    // Handle Timers
    if (this.data.freezeTimer > 0) {
      this.data.freezeTimer--;
      return false; // Stationary while frozen
    }

    let effectiveSpeed = this.data.speed;
    if (this.data.slowTimer > 0) {
      this.data.slowTimer--;
      effectiveSpeed *= this.data.slowFactor;
      if (this.data.slowTimer <= 0) {
        this.data.slowFactor = 1;
      }
    }

    // Spore Speed Boost (+30% speed)
    if (this.data.sporeBoostTimer && this.data.sporeBoostTimer > 0) {
      this.data.sporeBoostTimer--;
      effectiveSpeed *= 1.3;
    }

    let distanceToMove = effectiveSpeed;

    while (distanceToMove > 0) {
      const target = waypoints[this.data.waypointIndex + 1];
      if (!target) return true; // Reached base/end

      const dx = target.x - this.data.position.x;
      const dy = target.y - this.data.position.y;
      const distToNext = Math.hypot(dx, dy);

      if (distToNext <= distanceToMove) {
        this.data.position.x = target.x;
        this.data.position.y = target.y;
        this.data.waypointIndex++;
        distanceToMove -= distToNext;
      } else {
        this.data.position.x += (dx / distToNext) * distanceToMove;
        this.data.position.y += (dy / distToNext) * distanceToMove;
        distanceToMove = 0;
      }
    }

    return false;
  }

  /**
   * @param uiScale Ver Game2D.uiScale — o canvas interno é fixo em 840×600 e é
   *   escalado por CSS; num telefone (~0.43x) a barra de vida de 4px encolhe
   *   para ~1.7px reais, ilegível. `uiScale` (>=1, calculado a partir da
   *   largura CSS real do canvas) amplia altura/deslocamento da barra e a
   *   fonte do "+" de regeneração na mesma proporção, mantendo o tamanho
   *   aparente em tela constante independente do aparelho.
   */
  public render(ctx: CanvasRenderingContext2D, uiScale = 1) {
    if (this.data.isDead) return;

    // Regeneração junto à mata (Moss Giant): anel verde pulsante
    if (this.isRegenerating) {
      const pulse = 3 + (this.mossRegenTimer / 20) * 4;
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.radius + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(139, 195, 74, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#aed581';
      ctx.font = `bold ${Math.round(11 * uiScale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('+', this.data.position.x + this.data.radius + 6, this.data.position.y - this.data.radius);
    }

    // Spore Boost Aura
    if (this.data.sporeBoostTimer && this.data.sporeBoostTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124, 179, 66, 0.4)';
      ctx.fill();
    }

    // Energy Shield Barrier
    if (this.data.shieldHp > 0) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(2, 136, 209, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#29b6f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Slow/Freeze Aura
    if (this.data.freezeTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.fill();
    } else if (this.data.slowTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(41, 121, 255, 0.3)';
      ctx.fill();
    }

    // Body & Spritesheet Render
    if (this.data.type === 'BLACK_MEGA_BOSS') {
      const state = this.data.freezeTimer > 0 ? 'HURT' : 'MOVING';
      MegaBossSpriteRenderer.getInstance().render(
        ctx,
        this.data.position.x,
        this.data.position.y,
        76,
        state
      );
    } else {
      const drawn = SpriteManager.getInstance().drawSpriteAsset(
        ctx,
        this.data.type,
        this.data.position.x,
        this.data.position.y,
        this.data.radius * 2.4
      );

      if (!drawn) {
        ctx.beginPath();
        ctx.arc(this.data.position.x, this.data.position.y, this.data.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.data.freezeTimer > 0 ? '#80deea' : this.data.color;
        ctx.fill();

        ctx.strokeStyle = this.data.type === 'BOSS' ? '#ffd700' : this.data.type === 'MOSS_GIANT' ? '#aed581' : '#ffffff';
        ctx.lineWidth = this.data.type === 'BOSS' ? 3.5 : 1.5;
        ctx.stroke();
      }
    }

    // HP Bar & Shield Bar — altura e deslocamento escalados por uiScale (E1):
    // 4px de altura no canvas virava ~1.7px reais num telefone de 360px.
    const barWidth = this.data.radius * 2.2;
    const barHeight = (this.data.type === 'BOSS' ? 6 : 4) * uiScale;
    const barGap = (this.data.type === 'BOSS' ? 10 : 8) * uiScale;
    const barX = this.data.position.x - barWidth / 2;
    const barY = this.data.position.y - this.data.radius - barGap;

    ctx.fillStyle = '#222222';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpRatio = Math.max(0, this.data.hp / this.data.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.2 ? '#ff9800' : '#f44336';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Shield Bar overlay
    if (this.data.maxShieldHp > 0 && this.data.shieldHp > 0) {
      const shieldRatio = Math.max(0, this.data.shieldHp / this.data.maxShieldHp);
      ctx.fillStyle = '#29b6f6';
      ctx.fillRect(barX, barY - 3 * uiScale, barWidth * shieldRatio, 2 * uiScale);
    }
  }
}
