import { getRogueliteModule, getSpecializationOption, isValidSpecialization } from './Specializations';
import { SpriteManager } from './SpriteManager';
import { TalentManager } from './TalentManager';
import { EventBus } from './EventBus';
import type { Enemy2D } from './Enemy';
import type { GameState } from './GameState';
import type {
  ChallengeMode,
  ITower2D,
  RogueliteModuleId,
  TargetingStrategy,
  TowerSpecialization,
  TowerType,
  Vector2D,
} from '../types';

export class Tower2D {
  public data: ITower2D;
  public vampiricAcc = 0;
  private readonly size = 40;
  constructor(gridX: number, gridY: number, tileSize: number, type: TowerType, id: string) {
    const center: Vector2D = {
      x: gridX * tileSize + tileSize / 2,
      y: gridY * tileSize + tileSize / 2,
    };

    const config = Tower2D.getTowerConfig(type);

    this.data = {
      id,
      type,
      gridX,
      gridY,
      range: config.range,
      damage: config.damage,
      fireRate: config.fireRate,
      cooldownTimer: 0,
      cost: config.cost,
      level: 1,
      position: center,
      targeting: 'FIRST',
      splashRadius: config.splashRadius,
      slowFactor: config.slowFactor,
      hp: Math.round(100 * (type === 'ARTILLERY' || type === 'CANNON' ? 1.5 : 1.0)),
      maxHp: Math.round(100 * (type === 'ARTILLERY' || type === 'CANNON' ? 1.5 : 1.0)),
      isDestroyed: false,
      kills: 0,
    };
  }

  public static getTowerConfig(type: TowerType) {
    switch (type) {
      case 'CANNON':
        return { cost: 105, range: 120, damage: 14, fireRate: 90 };
      case 'SOLAR_PRISM':
        return { cost: 100, range: 140, damage: 6, fireRate: 24 };
      case 'FROST':
        return { cost: 70, range: 130, damage: 2, fireRate: 40, slowFactor: 0.5 };
      case 'ARTILLERY':
        return { cost: 110, range: 170, damage: 25, fireRate: 110, splashRadius: 50 };
      case 'BASIC':
      default:
        return { cost: 50, range: 150, damage: 5, fireRate: 45 };
    }
  }

  public cycleTargeting() {
    const strategies: TargetingStrategy[] = ['FIRST', 'STRONGEST', 'WEAKEST', 'LAST'];
    const nextIndex = (strategies.indexOf(this.data.targeting) + 1) % strategies.length;
    this.data.targeting = strategies[nextIndex];
  }

  /**
   * Custo do upgrade PARA o nível atual+1. Para level<=3, `Math.max(0, level-3)`
   * zera o expoente e a fórmula fica bit-a-bit igual à de antes dos ranks
   * infinitos (P1_BALANCE_SPEC §1.6) — zero regressão nos níveis 1-3.
   */
  public getUpgradeCost(): number {
    const rank = Math.max(0, this.data.level - 3);
    return Math.floor(this.data.cost * 0.8 * this.data.level * Math.pow(1.10, rank));
  }

  public getSellValue(): number {
    let totalInvested = this.data.cost;
    for (let l = 1; l < this.data.level; l++) {
      // Mesma fórmula fechada de getUpgradeCost(), não uma variável acumulada
      // por multiplicações sucessivas — evita reintroduzir aqui a mesma
      // armadilha de arredondamento composto do §1.3.
      const rank = Math.max(0, l - 3);
      totalInvested += Math.floor(this.data.cost * 0.8 * l * Math.pow(1.10, rank));
    }
    return Math.floor(totalInvested * 0.7);
  }

  /**
   * Sobe um nível. O salto de 2 para 3 exige a escolha de uma especialização
   * válida para o tipo — é onde a torre deixa de ser genérica. Ranks 4+ são
   * genéricos e infinitos (P1_BALANCE_SPEC §1.2): o teto de retorno `false`
   * por nível deixou de existir — só falha quando a especialização obrigatória
   * do nível 2→3 está ausente/invalida.
   */
  public upgrade(specialization?: TowerSpecialization): boolean {
    if (this.data.isDestroyed) return false;

    const isSpecializing = this.data.level === 2;
    if (isSpecializing) {
      if (!specialization) return false;
      if (!isValidSpecialization(this.data.type, specialization)) return false;
    }

    const isGenericGrowth = this.data.level < 3;
    this.data.level++;

    if (isGenericGrowth) {
      // Níveis 1→2 e 2→3: fórmula genérica antiga, intocada.
      this.data.damage = Math.floor(this.data.damage * 1.5);
      this.data.range = Math.floor(this.data.range * 1.15);
      this.data.maxHp = Math.floor(this.data.maxHp * 1.4);
      this.data.hp = this.data.maxHp;
      if (this.data.splashRadius) {
        this.data.splashRadius = Math.floor(this.data.splashRadius * 1.1);
      }

      if (isSpecializing && specialization) {
        this.data.specialization = specialization;
        this.applySpecializationStats(specialization);
      }

      // Baseline de rank: capturado exatamente quando `level` chega a 3,
      // DEPOIS de applySpecializationStats() rodar (senão SIEGE/NAPALM/
      // MULTISHOT ficariam sem efeito nos ranks — P1_BALANCE_SPEC §1.4).
      // Nunca mais reescrito depois disso.
      if (this.data.level === 3) {
        this.data.rankBaseline = {
          damage: this.data.damage,
          range: this.data.range,
          maxHp: this.data.maxHp,
          splashRadius: this.data.splashRadius,
        };
      }
    } else {
      // Rank N = level-3, sempre recalculado a partir do baseline fechado do
      // nível 3 — NUNCA `floor()` sobre o valor já arredondado do rank
      // anterior. Essa recorrência trava para sempre torres de dano baixo
      // (BASIC nível 3 = 10: floor(10*1.08) = 10 para qualquer rank) — P1_BALANCE_SPEC §1.3.
      const rank = this.data.level - 3;
      const baseline = this.data.rankBaseline;
      if (baseline) {
        this.data.damage = Math.floor(baseline.damage * Math.pow(1.08, rank));
        this.data.range = Math.floor(baseline.range * Math.pow(1.02, Math.min(rank, 25)));
        this.data.maxHp = Math.floor(baseline.maxHp * Math.pow(1.05, rank));
        this.data.hp = this.data.maxHp;
        if (baseline.splashRadius !== undefined) {
          this.data.splashRadius = Math.floor(baseline.splashRadius * Math.pow(1.01, Math.min(rank, 40)));
        }
      }
      // fireRate fica de fora de propósito: a cadência já diferencia as
      // especializações (DEEP_FREEZE triplica o intervalo, MULTISHOT mantém
      // o normal) — ranks não podem vazar nesse eixo (§1.2).
    }

    return true;
  }

  /**
   * Efeitos de especialização que são puro atributo. Os que mudam a forma de
   * atirar (MULTISHOT, PIERCING, EXECUTIONER, DEEP_FREEZE, CHAIN_BEAM...) ficam
   * no TowerManager, onde o disparo é resolvido.
   */
  private applySpecializationStats(spec: TowerSpecialization) {
    switch (spec) {
      case 'SIEGE':
        this.data.range = Math.floor(this.data.range * 1.4);
        break;
      case 'NAPALM':
        this.data.splashRadius = Math.floor((this.data.splashRadius || 50) * 1.8);
        break;
      case 'SHRAPNEL':
        // Canhão não tinha área nenhuma; ganha um estouro modesto.
        this.data.splashRadius = 34;
        break;
      case 'PERMAFROST':
        this.data.slowFactor = 0.25;
        break;
      case 'DEEP_FREEZE':
        // Congelar a cada pulso normal seria travar tudo para sempre: o pulso
        // fica bem mais lento em troca do controle.
        this.data.fireRate = Math.round(this.data.fireRate * 3);
        break;
      case 'MULTISHOT':
        // O segundo alvo já é meio disparo extra; compensa no dano por tiro.
        this.data.damage = Math.max(1, Math.round(this.data.damage * 0.8));
        break;
      default:
        break;
    }
  }

  public takeDamage(amount: number): boolean {
    if (this.data.isDestroyed) return true;
    this.data.hp = Math.max(0, this.data.hp - amount);
    if (this.data.hp <= 0) {
      this.data.isDestroyed = true;
    }
    return this.data.isDestroyed;
  }

  /**
   * @param challengeMode Custo de reparo sobe com a dificuldade escolhida —
   *   HARDCORE cobra 1.5x, MORTE_CERTA 2x — aplicado sobre o custo base, ANTES
   *   do desconto do talento Engineering (senão o desconto anularia o modificador
   *   de dificuldade em vez de descontar sobre ele).
   */
  public getRepairCost(talentManager?: TalentManager, challengeMode: ChallengeMode = 'NORMAL'): number {
    let cost = 0;
    if (this.data.isDestroyed) {
      // 30% cheaper than new tower cost
      cost = Math.ceil(this.data.cost * 0.7);
    } else {
      const missingHpRatio = (this.data.maxHp - this.data.hp) / this.data.maxHp;
      cost = Math.max(5, Math.ceil(this.data.cost * 0.7 * missingHpRatio));
    }
    const repairCostMultiplier =
      challengeMode === 'MORTE_CERTA' ? 2.0 : challengeMode === 'HARDCORE' ? 1.5 : 1.0;
    cost = Math.ceil(cost * repairCostMultiplier);
    if (talentManager) {
      const discount = talentManager.getRepairDiscount();
      cost = Math.max(1, Math.floor(cost * (1 - discount)));
    }
    return cost;
  }

  public repair(): boolean {
    this.data.hp = this.data.maxHp;
    this.data.isDestroyed = false;
    return true;
  }

  public equipModule(moduleId: RogueliteModuleId): boolean {
    if (this.data.level < 2 || this.data.isDestroyed) return false;
    this.data.equippedModule = moduleId;
    return true;
  }

  public update(): boolean {
    if (this.data.isDestroyed) return false;
    if (this.data.overheatTimer && this.data.overheatTimer > 0) {
      this.data.overheatTimer--;
      return false;
    }
    if (this.data.cooldownTimer > 0) {
      this.data.cooldownTimer--;
      return false;
    }
    return true;
  }

  /**
   * @param showAllRanges Leitura de campo (D5): desenha o alcance mesmo sem
   *   seleção/hover, para planejar cobertura com todas as torres de uma vez.
   *   Usa o mesmo estilo do hover (azul, não o amarelo de seleção) para não
   *   confundir com a torre realmente selecionada.
   */
  public render(ctx: CanvasRenderingContext2D, isSelected = false, isHovered = false, showAllRanges = false) {
    const half = this.size / 2;

    // Range visualizer on select, hover, or "show all ranges" toggle
    if (isSelected || isHovered || showAllRanges) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.range, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(255, 235, 59, 0.03)' : 'rgba(33, 150, 243, 0.03)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#fbc02d' : '#2196f3';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    }

    // Base body color per type
    let color = '#1565c0'; // Basic
    if (this.data.type === 'CANNON') color = '#d84315';
    if (this.data.type === 'SOLAR_PRISM') color = '#ff8f00';
    if (this.data.type === 'FROST') color = '#00838f';
    if (this.data.type === 'ARTILLERY') color = '#4a148c';

    if (this.data.isDestroyed) {
      // Destroyed Crater Render
      ctx.fillStyle = '#212121';
      ctx.fillRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);
      ctx.strokeStyle = '#f44336';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❌', this.data.position.x, this.data.position.y + 4);
      return;
    }

    ctx.fillStyle = color;
    ctx.fillRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);

    // Border
    ctx.strokeStyle = isSelected ? '#ffeb3b' : '#ffffff';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.strokeRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);

    // Marca de torre erguida em tile Overgrowth Sprout (+25% alcance, metade do cooldown)
    if (this.data.onSproutTile) {
      ctx.strokeStyle = '#8bc34a';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.data.position.x - half + 3, this.data.position.y - half + 3, this.size - 6, this.size - 6);
    }
    // Marca de torre erguida em Altar Obscuro (+25% de dano necrótico)
    if (this.data.onDarkAltarTile) {
      ctx.strokeStyle = '#ab47bc';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.data.position.x - half + 3, this.data.position.y - half + 3, this.size - 6, this.size - 6);
    }
    // Marca de torre em Power Surge (+20% cadência)
    if (this.data.isPowerSurged) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.data.position.x - half - 2, this.data.position.y - half - 2, this.size + 4, this.size + 4);
    }

    // Indicador de superaquecimento por erupção de lava
    if (this.data.overheatTimer && this.data.overheatTimer > 0) {
      ctx.fillStyle = 'rgba(255, 87, 34, 0.45)';
      ctx.fillRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);
      ctx.fillStyle = '#ff5722';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔥', this.data.position.x, this.data.position.y + 5);
    }

    // Core icon / shape
    const drawn = SpriteManager.getInstance().drawSpriteAsset(
      ctx,
      this.data.type,
      this.data.position.x,
      this.data.position.y,
      24
    );

    if (!drawn) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, 9, 0, Math.PI * 2);
      let coreColor = '#90caf9';
      if (this.data.type === 'CANNON') coreColor = '#ff7043';
      if (this.data.type === 'SOLAR_PRISM') coreColor = '#ffeb3b';
      if (this.data.type === 'FROST') coreColor = '#80deea';
      if (this.data.type === 'ARTILLERY') coreColor = '#e1bee7';
      ctx.fillStyle = coreColor;
      ctx.fill();
    }

    // Ícone da especialização: identifica de relance o papel da torre no tabuleiro
    if (this.data.specialization) {
      const option = getSpecializationOption(this.data.specialization);
      if (option) {
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(option.icon, this.data.position.x + half - 7, this.data.position.y - half + 12);
      }
    }
    // Ícone do módulo equipado
    if (this.data.equippedModule) {
      const mod = getRogueliteModule(this.data.equippedModule);
      if (mod) {
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(mod.icon, this.data.position.x - half + 7, this.data.position.y - half + 12);
      }
    }

    // Level indicator dots. Acima do rank 3 (nível 4+) o laço de N pontos
    // atravessaria o tile inteiro de 40px (23 pontos no rank 20) — trava em
    // 3 pontos fixos e comunica o resto com um rótulo "×N" (P1_BALANCE_SPEC §1.8).
    const dotCount = Math.min(this.data.level, 3);
    for (let i = 0; i < dotCount; i++) {
      ctx.beginPath();
      ctx.arc(
        this.data.position.x - 8 + i * 8,
        this.data.position.y + half - 5,
        2.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#ffeb3b';
      ctx.fill();
    }
    if (this.data.level > 3) {
      ctx.fillStyle = '#ffeb3b';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`×${this.data.level}`, this.data.position.x - 8 + 2 * 8 + 5, this.data.position.y + half - 5);
      ctx.textAlign = 'center'; // devolve o padrão usado pelo resto do método
    }

    // Health Bar if damaged
    if (this.data.hp < this.data.maxHp) {
      const bw = this.size - 4;
      const bh = 4;
      const bx = this.data.position.x - bw / 2;
      const by = this.data.position.y - half - 7;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, bh);
      const hpRatio = Math.max(0, this.data.hp / this.data.maxHp);
      ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(bx, by, bw * hpRatio, bh);
    }
  }
}
export function handleTowerDamageDealt(
  tower: Tower2D,
  enemy: Enemy2D,
  damageDealt: number,
  gameState: GameState,
  nearbyEnemies?: Enemy2D[]
) {
  if (!tower) return;

  // Voltaic Overcharge: um tiro que acerta um alvo já lento/congelado descarrega
  // uma faísca elétrica nos vizinhos (8 dano AoE, raio 40px). É dano em área:
  // ignora armadura (armorPenetration=1) e não é esquivável (isAvoidable=false),
  // igual a todo outro dano em área do projeto. `nearbyEnemies` é opcional porque
  // nem toda chamada (ex.: testes antigos) tem a lista de inimigos à mão — sem
  // ela a faísca simplesmente não dispara, nunca quebra a chamada.
  //
  // CUIDADO: a faísca aplica dano via `takeDamage` direto, SEM voltar a chamar
  // `handleTowerDamageDealt` para os alvos atingidos. Se voltasse, um vizinho
  // também lento/congelado disparava outra faísca, que podia disparar outra, e
  // a "explosão elétrica" varreria o mapa inteiro num único frame.
  if (
    tower.data.equippedModule === 'VOLTAIC_OVERCHARGE' &&
    nearbyEnemies &&
    (enemy.data.slowTimer > 0 || enemy.data.freezeTimer > 0)
  ) {
    const SPARK_DAMAGE = 8;
    const SPARK_RADIUS_SQ = 40 * 40; // comparação ao quadrado: caminho quente, sem Math.hypot
    for (const other of nearbyEnemies) {
      if (other === enemy || other.data.isDead) continue;
      const dx = other.data.position.x - enemy.data.position.x;
      const dy = other.data.position.y - enemy.data.position.y;
      if (dx * dx + dy * dy <= SPARK_RADIUS_SQ) {
        other.takeDamage(SPARK_DAMAGE, 1, false);
      }
    }
  }

  // Track Vampiric Drain
  if (tower.data.equippedModule === 'VAMPIRIC_DRAIN' && damageDealt > 0) {
    tower.vampiricAcc += damageDealt;
    while (tower.vampiricAcc >= 100) {
      tower.vampiricAcc -= 100;
      if (gameState.baseHp < gameState.maxBaseHp) {
        gameState.baseHp = Math.min(gameState.maxBaseHp, gameState.baseHp + 1);
        EventBus.getInstance().emit('hp:change', { current: gameState.baseHp, max: gameState.maxBaseHp });
      }
    }
  }

  // Track Kill & Kill-based Modules (Midas Touch & Bounty Hunter)
  if (enemy.data.isDead || enemy.data.hp <= 0) {
    tower.data.kills = (tower.data.kills || 0) + 1;

    if (tower.data.equippedModule === 'MIDAS_TOUCH') {
      if (tower.data.kills % 5 === 0) {
        gameState.addGold(2);
      }
    }

    if (tower.data.equippedModule === 'BOUNTY_HUNTER') {
      const isBossOrTank =
        enemy.data.type === 'BOSS' ||
        enemy.data.type === 'BLACK_MEGA_BOSS' ||
        enemy.data.type === 'TANK';
      if (isBossOrTank) {
        const bonusGold = Math.ceil((enemy.data.goldReward || 10) * 0.2);
        gameState.addGold(bonusGold);
      }
    }
  }
}
