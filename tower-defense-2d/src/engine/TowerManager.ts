import type { TowerSpecialization, TowerType } from '../types';
import { isValidSpecialization } from './Specializations';
import { AchievementManager } from './AchievementManager';
import { EventBus } from './EventBus';
import { HAPTIC_PATTERNS, vibrate } from '../helpers/haptics';
import { AnalyticsManager } from './AnalyticsManager';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { GameState } from './GameState';
import { MapManager2D } from './MapManager';
import { ParticleManager } from './ParticleManager';
import { ProjectileManager2D } from './ProjectileManager';
import { Rng } from './Rng';
import { TalentManager } from './TalentManager';
import { handleTowerDamageDealt, Tower2D } from './Tower';
import type { ReplayEngine } from './ReplayEngine';

export class TowerManager2D {
  public mapManager: MapManager2D;
  public selectedTower: Tower2D | null = null;
  public selectedBuildType: TowerType = 'BASIC';
  public nextTowerId: number = 1;
  private towers: Tower2D[] = [];
  private projectileManager: ProjectileManager2D;
  private gameState: GameState;
  private audioManager: AudioManager;
  private particleManager?: ParticleManager;
  private talentManager?: TalentManager;
  private achievementManager?: AchievementManager;
  private analyticsManager?: AnalyticsManager;
  private replayEngine?: ReplayEngine;
  private rng: Rng;
  // Buffer reutilizado pelo laço de aquisição de alvo em update(): evita alocar
  // um array novo por torre por quadro (30 torres x 40 inimigos x 60fps ~ 72k
  // arrays/s antes). Escopo de instância, não de tower, porque cada torre usa
  // o buffer e descarta o conteúdo antes da próxima (nunca guardado além do
  // corpo do laço), então uma única lista pode ser limpa e repreenchida.
  private inRangeEnemiesBuffer: Enemy2D[] = [];
  public sproutTiles: { x: number; y: number }[] = [];
  public darkAltarTiles: { x: number; y: number }[] = [];
  /**
   * Leitura de campo (D5): quando ligado, desenha o alcance de TODAS as
   * torres, não só da selecionada/sob o mouse. Sem isto, planejar cobertura
   * exige selecionar torre por torre ou passar o mouse em cada uma.
   */
  public showAllRanges = false;
  constructor(
    mapManager: MapManager2D,
    projectileManager: ProjectileManager2D,
    gameState: GameState,
    audioManager: AudioManager,
    particleManager?: ParticleManager,
    talentManager?: TalentManager,
    analyticsManager?: AnalyticsManager,
    achievementManager?: AchievementManager,
    rng?: Rng
  ) {
    this.mapManager = mapManager;
    this.projectileManager = projectileManager;
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.particleManager = particleManager;
    this.talentManager = talentManager;
    this.analyticsManager = analyticsManager;
    this.achievementManager = achievementManager;
    this.rng = rng || new Rng(Date.now());
  }

  public setParticleManager(pm: ParticleManager) {
    this.particleManager = pm;
  }

  public setReplayEngine(re: ReplayEngine) {
    this.replayEngine = re;
  }

  public getTowerAt(gridX: number, gridY: number): Tower2D | undefined {
    return this.towers.find(t => t.data.gridX === gridX && t.data.gridY === gridY);
  }

  public isSproutTile(gridX: number, gridY: number): boolean {
    return this.sproutTiles.some(s => s.x === gridX && s.y === gridY);
  }
  public isDarkAltarTile(gridX: number, gridY: number): boolean {
    return this.darkAltarTiles.some(s => s.x === gridX && s.y === gridY);
  }


  public getTowerCost(type: TowerType): number {
    switch (type) {
      case 'ARTILLERY': return 110;
      case 'CANNON': return 105;
      case 'SOLAR_PRISM': return 100;
      case 'FROST': return 70;
      case 'BASIC':
      default: return 50;
    }
  }

  public placeTower(gridX: number, gridY: number): boolean {
    const existing = this.getTowerAt(gridX, gridY);
    if (existing) {
      this.selectedTower = existing;
      EventBus.getInstance().emit('tower:select', this.selectedTower);
      return true;
    }

    this.selectedTower = null;
    EventBus.getInstance().emit('tower:select', null);
    if (!this.mapManager.isBuildable(gridX, gridY)) {
      return false;
    }

    const cost = this.getTowerCost(this.selectedBuildType);
    if (!this.gameState.spendGold(cost)) {
      return false; // Not enough gold
    }

    if (this.analyticsManager) {
      this.analyticsManager.recordGoldSpent(cost);
    }

    const tower = new Tower2D(gridX, gridY, this.mapManager.tileSize, this.selectedBuildType, `tower-${this.nextTowerId++}`);

    // Check Overgrowth Sprout Twist (+25% range bonus)
    const isSproutTile = this.sproutTiles.some(s => s.x === gridX && s.y === gridY);
    if (isSproutTile) {
      tower.data.onSproutTile = true;
      tower.data.range = Math.round(tower.data.range * 1.25);
    }
    // Check Dark Altar Twist (+25% damage bonus)
    const isDarkAltarTile = this.darkAltarTiles.some(s => s.x === gridX && s.y === gridY);
    if (isDarkAltarTile) {
      tower.data.onDarkAltarTile = true;
      tower.data.damage = Math.round(tower.data.damage * 1.25);
    }


    // Check Power Surge Hazard (+25% attack speed & +10% damage bonus)
    if (this.mapManager.isPowerSurgeTile(gridX, gridY)) {
      tower.data.isPowerSurged = true;
      tower.data.damage = Math.round(tower.data.damage * 1.1);
      tower.data.fireRate = Math.max(1, Math.round(tower.data.fireRate * 0.83));
    }

    // Apply Talent Damage Bonus if unlocked
    if (this.talentManager) {
      tower.data.damage = Math.round(tower.data.damage * this.talentManager.getDamageBonusMultiplier());
    }

    this.towers.push(tower);
    this.selectedTower = tower;
    this.replayEngine?.recordAction('BUILD_TOWER', { gridX, gridY, towerType: this.selectedBuildType });
    EventBus.getInstance().emit('tower:select', this.selectedTower);
    vibrate(HAPTIC_PATTERNS.TOWER_BUILT);
    return true;
  }

  /**
   * Melhora a torre selecionada. O salto de nível 2 para 3 exige a
   * especialização escolhida; sem ela o ouro não é gasto.
   */
  public upgradeSelectedTower(specialization?: TowerSpecialization): boolean {
    if (!this.selectedTower) return false;
    const cost = this.selectedTower.getUpgradeCost();
    if (this.selectedTower.data.level >= 3) return false;

    // Valida antes de cobrar: cobrar e falhar torraria o ouro do jogador.
    if (this.selectedTower.data.level === 2) {
      if (!specialization) return false;
      if (!isValidSpecialization(this.selectedTower.data.type, specialization)) return false;
    }

    if (this.gameState.spendGold(cost)) {
      if (this.analyticsManager) {
        this.analyticsManager.recordGoldSpent(cost);
      }
      const upgraded = this.selectedTower.upgrade(specialization);
      if (upgraded) {
        this.replayEngine?.recordAction('UPGRADE_TOWER', { gridX: this.selectedTower.data.gridX, gridY: this.selectedTower.data.gridY, specialization });
        EventBus.getInstance().emit('tower:select', this.selectedTower);
        vibrate(HAPTIC_PATTERNS.TOWER_UPGRADED);
      }
      return upgraded;
    }
    return false;
  }

  public sellSelectedTower(): boolean {
    if (!this.selectedTower) return false;
    const refund = this.selectedTower.getSellValue();
    this.gameState.addGold(refund);

    this.replayEngine?.recordAction('SELL_TOWER', { gridX: this.selectedTower.data.gridX, gridY: this.selectedTower.data.gridY });

    const index = this.towers.indexOf(this.selectedTower);
    if (index !== -1) {
      this.towers.splice(index, 1);
    }
    this.selectedTower = null;
    EventBus.getInstance().emit('tower:select', null);
    return true;
  }

  public cycleSelectedTowerTargeting() {
    if (this.selectedTower) {
      this.selectedTower.cycleTargeting();
      EventBus.getInstance().emit('tower:select', this.selectedTower);
    }
  }

  public repairSelectedTower(): boolean {
    if (!this.selectedTower) return false;
    const cost = this.selectedTower.getRepairCost(this.talentManager, this.gameState.challengeMode);
    if (this.selectedTower.data.hp >= this.selectedTower.data.maxHp && !this.selectedTower.data.isDestroyed) return false;

    if (this.gameState.spendGold(cost)) {
      if (this.analyticsManager) {
        this.analyticsManager.recordGoldSpent(cost);
      }
      this.selectedTower.repair();
      if (this.achievementManager) {
        this.achievementManager.addProgress('FIELD_ENGINEER', 1);
      }
      EventBus.getInstance().emit('tower:select', this.selectedTower);
      return true;
    }
    return false;
  }

  public getTowers(): Tower2D[] {
    return this.towers;
  }

  public setSelectedBuildType(type: TowerType) {
    this.selectedBuildType = type;
    EventBus.getInstance().emit('tower:buildType', this.selectedBuildType);
  }

  /**
   * Alterna a exibição do alcance de todas as torres simultaneamente (D5).
   * Emite um evento para a HUD sincronizar o botão mesmo quando o atalho de
   * teclado (não o clique) foi a origem da mudança.
   */
  public toggleShowAllRanges(): boolean {
    this.showAllRanges = !this.showAllRanges;
    EventBus.getInstance().emit('ranges:toggle', this.showAllRanges);
    return this.showAllRanges;
  }

  public update(enemies: Enemy2D[], fxManager?: FXManager) {
    for (const tower of this.towers) {
      // Rastreamento contínuo de posição para o feixe do Prisma Solar a cada frame
      if (tower.data.type === 'SOLAR_PRISM' && tower.data.laserTargetId) {
        const currentTarget = enemies.find(e => e.data.id === tower.data.laserTargetId && !e.data.isDead);
        if (currentTarget) {
          let effRange = tower.data.range;
          if (this.mapManager.hazardState?.isMistActive) {
            effRange = Math.round(effRange * 0.8);
          }
          const dx = currentTarget.data.position.x - tower.data.position.x;
          const dy = currentTarget.data.position.y - tower.data.position.y;
          if (Math.hypot(dx, dy) <= effRange) {
            tower.data.laserTargetPos = { ...currentTarget.data.position };
          } else {
            tower.data.laserTargetId = undefined;
            tower.data.laserTargetPos = undefined;
            tower.data.beamDuration = 0;
          }
        } else {
          tower.data.laserTargetId = undefined;
          tower.data.laserTargetPos = undefined;
          tower.data.beamDuration = 0;
        }
      }

      const readyToShoot = tower.update();
      if (!readyToShoot) continue;
      let effectiveRange = tower.data.range;
      if (this.mapManager.hazardState?.isMistActive) {
        effectiveRange = Math.round(effectiveRange * 0.8);
      }

      // Filter in-range enemies. Comparamos o quadrado da distância em vez de
      // Math.hypot: para "distância <= alcance" com ambos os lados >= 0, elevar
      // ao quadrado preserva a comparação e elimina a raiz do laço mais quente
      // do jogo (torres x inimigos, por quadro, multiplicado pelos sub-passos
      // em 2x/4x). Escrevemos no buffer de instância em vez de `.filter(...)`
      // para não alocar um array novo por torre por quadro; a ordem de
      // inserção é a mesma de `enemies`, preservando os empates de FIRST/LAST/
      // STRONGEST/WEAKEST e a ordem do `.find()` de alvo secundário abaixo.
      const effectiveRangeSq = effectiveRange * effectiveRange;
      this.inRangeEnemiesBuffer.length = 0;
      for (const e of enemies) {
        if (e.data.isDead) continue;
        const dx = e.data.position.x - tower.data.position.x;
        const dy = e.data.position.y - tower.data.position.y;
        if (dx * dx + dy * dy <= effectiveRangeSq) {
          this.inRangeEnemiesBuffer.push(e);
        }
      }
      const inRangeEnemies = this.inRangeEnemiesBuffer;

      if (inRangeEnemies.length === 0) {
        tower.data.laserTargetId = undefined;
        tower.data.laserTargetPos = undefined;
        tower.data.beamDuration = 0;
        continue;
      }

      // 1. Frost Tower: AoE Glacial Pulse
      if (tower.data.type === 'FROST') {
        this.audioManager.playFrostShot();
        // A partícula usa o MESMO raio que decidiu quem é atingido (effectiveRange,
        // reduzido sob névoa) — desenhar com tower.data.range faria a onda glacial
        // cobrir visualmente inimigos que não tomam dano nenhum sob névoa.
        this.particleManager?.triggerFrostPulse(
          tower.data.position.x,
          tower.data.position.y,
          effectiveRange
        );
        const spec = tower.data.specialization;
        for (const enemy of inRangeEnemies) {
          // Pulso glacial: sofre a armadura do alvo normalmente (0 penetração),
          // mas é área — não pode ser desviado pelo Runner (isAvoidable=false).
          const dmgDealt = enemy.takeDamage(tower.data.damage, 0, false);
          if (dmgDealt > 0) {
            if (this.analyticsManager) {
              this.analyticsManager.recordDamage('FROST', dmgDealt);
            }
            handleTowerDamageDealt(tower, enemy, dmgDealt, this.gameState, enemies);
          }
          const slowMult = this.mapManager.hazardState?.isMistActive ? 0.75 : 1.0;
          if (spec === 'DEEP_FREEZE') {
            // Pulso raro (fireRate triplicado) mas que trava tudo no lugar.
            enemy.applyFreeze(Math.round(60 / slowMult));
          } else if (spec === 'PERMAFROST') {
            enemy.applySlow((tower.data.slowFactor || 0.25) * slowMult, 240);
          } else {
            enemy.applySlow((tower.data.slowFactor || 0.5) * slowMult, 120);
          }
        }
        tower.data.cooldownTimer = tower.data.fireRate;
        continue;
      }

      // Select target according to tower's targeting strategy
      let target: Enemy2D = inRangeEnemies[0];
      switch (tower.data.targeting) {
        case 'STRONGEST':
          target = inRangeEnemies.reduce((prev, curr) => (curr.data.hp > prev.data.hp ? curr : prev));
          break;
        case 'WEAKEST':
          target = inRangeEnemies.reduce((prev, curr) => (curr.data.hp < prev.data.hp ? curr : prev));
          break;
        case 'LAST':
          target = inRangeEnemies.reduce((prev, curr) => (curr.data.waypointIndex < prev.data.waypointIndex ? curr : prev));
          break;
        case 'FIRST':
        default:
          target = inRangeEnemies.reduce((prev, curr) => (curr.data.waypointIndex > prev.data.waypointIndex ? curr : prev));
          break;
      }

      if (target) {
        // 2. Solar Prism Laser Beam (Focus mechanic: +25% damage per sec)
        if (tower.data.type === 'SOLAR_PRISM') {
          const cd = tower.data.onSproutTile ? Math.floor(tower.data.fireRate / 2) : tower.data.fireRate;
          if (tower.data.laserTargetId === target.data.id) {
            tower.data.beamDuration = (tower.data.beamDuration || 0) + cd;
          } else {
            tower.data.laserTargetId = target.data.id;
            tower.data.beamDuration = 0;
          }
          tower.data.laserTargetPos = { ...target.data.position };

          // FOCUS_LENS: o foco sobe em metade do tempo
          const focusPeriod = tower.data.specialization === 'FOCUS_LENS' ? 30 : 60;
          const focusBonus = Math.min(1.5, Math.floor((tower.data.beamDuration || 0) / focusPeriod) * 0.25);
          const laserDmg = Math.round(tower.data.damage * (1 + focusBonus));

          // Antes ignorava a armadura por acidente (era o único disparo "pesado"
          // dos três não-BASIC); agora sofre 0 de penetração como as demais —
          // nerf intencional para a armadura valer de fato contra Tank/Moss Giant.
          const dmgDealt = target.takeDamage(laserDmg, 0, true);
          if (dmgDealt > 0) {
            if (this.analyticsManager) {
              this.analyticsManager.recordDamage('SOLAR_PRISM', dmgDealt);
            }
            handleTowerDamageDealt(tower, target, dmgDealt, this.gameState, enemies);
          }

          // CHAIN_BEAM ou PIERCING_CORE: o feixe salta para um segundo alvo por metade do dano
          if (tower.data.specialization === 'CHAIN_BEAM' || tower.data.equippedModule === 'PIERCING_CORE') {
            const secondary = inRangeEnemies.find(e => e !== target && !e.data.isDead);
            if (secondary) {
              const chainDmg = Math.max(1, Math.round(laserDmg * 0.5));
              const chainDealt = secondary.takeDamage(chainDmg, 0, true);
              if (chainDealt > 0) {
                if (this.analyticsManager) {
                  this.analyticsManager.recordDamage('SOLAR_PRISM', chainDealt);
                }
                handleTowerDamageDealt(tower, secondary, chainDealt, this.gameState, enemies);
              }
            }
          }
          if (fxManager && Math.random() < 0.3) {
            fxManager.addDamageText(target.data.position.x, target.data.position.y, `-${dmgDealt}`, '#ffff8d');
          }

          tower.data.cooldownTimer = Math.max(1, cd);
          continue;
        }

        let damage = tower.data.damage;
        let color = '#ffeb3b';
        let speed = 9;
        let radius = 4;
        let splashRadius: number | undefined;
        let isCrit = false;
        // 0..1 — quanto da armadura do alvo este disparo ignora. BASIC não
        // penetra por padrão; PIERCING e o Canhão são os diferenciais.
        let armorPenetration = 0;

        const spec = tower.data.specialization;
        const extraCritChance = this.talentManager ? this.talentManager.getCritChance() : 0;
        // Alvos do disparo: normalmente um só, dois com MULTISHOT.
        const targets: Enemy2D[] = [target];

        if (tower.data.type === 'BASIC') {
          // 20% Base Critical Hit chance + Talent Crit Chance
          if (this.rng.chance(0.20 + extraCritChance)) {
            damage *= 2;
            isCrit = true;
            color = '#ffea00';
          }

          if (spec === 'PIERCING') {
            armorPenetration = 1; // ignora 100% da armadura do alvo, como o texto da carta promete
            color = isCrit ? '#80d8ff' : '#b3e5fc';
          } else if (spec === 'MULTISHOT' || tower.data.equippedModule === 'PIERCING_CORE') {
            const secondary = inRangeEnemies.find(e => e !== target && !e.data.isDead);
            if (secondary) targets.push(secondary);
          }
          this.audioManager.playBasicShot();
        } else if (tower.data.type === 'CANNON') {
          // Diferencial permanente do Canhão (qualquer especialização): sempre
          // perfura metade da armadura do alvo.
          armorPenetration = 0.5;
          // Executioner (+100% damage against Tanks & Bosses > 50% HP)
          const targetHpRatio = target.data.hp / target.data.maxHp;
          // MOSS_GIANT fica de fora deliberadamente: a identidade dele é
          // regeneração/terreno, não alvo blindado — e o texto da carta só
          // promete Tank/Boss. BLACK_MEGA_BOSS entra porque é o chefe final do
          // Morte Certa, exatamente o momento em que o jogador escolheu o Executor.
          const isExecutionTarget =
            target.data.type === 'TANK' ||
            target.data.type === 'BOSS' ||
            target.data.type === 'BLACK_MEGA_BOSS';
          // EXECUTIONER derruba o corte de 50% de HP do bônus base
          const hpGateOk = spec === 'EXECUTIONER' || targetHpRatio >= 0.5;

          if (isExecutionTarget && hpGateOk) {
            damage *= 2;
            isCrit = true;
          } else if (this.rng.chance(extraCritChance)) {
            damage *= 2;
            isCrit = true;
          }
          color = '#ff5722';
          speed = 6;
          radius = 7;
          if (spec === 'SHRAPNEL' || tower.data.equippedModule === 'PIERCING_CORE') {
            const secondary = inRangeEnemies.find(e => e !== target && !e.data.isDead);
            if (secondary && spec !== 'SHRAPNEL') targets.push(secondary);
            if (spec === 'SHRAPNEL') splashRadius = tower.data.splashRadius;
          }
          this.audioManager.playCannonShot();
        } else if (tower.data.type === 'ARTILLERY') {
          // Artilharia sempre nasce com splashRadius > 0, então todo tiro passa
          // pelo ramo de respingo em Projectile.ts — mas esse ramo agora separa
          // o alvo primário (recebe armorPenetration abaixo e pode esquivar) das
          // vítimas secundárias no raio (dano em área, ignora armadura, não
          // esquivam). Sem essa separação o armorPenetration=0 daqui era código
          // morto: o alvo primário nunca chegava a passar pelo ramo de impacto
          // direto e saía sempre com penetração 1 (bug corrigido em Projectile.ts).
          armorPenetration = 0;
          if (this.rng.chance(extraCritChance)) {
            damage *= 2;
            isCrit = true;
          }
          color = '#ea80fc';
          speed = 5;
          radius = 9;
          splashRadius = tower.data.splashRadius;
          this.audioManager.playArtilleryShot();
          // Spawn Napalm Fire Patch on impact location
          if (this.particleManager) {
            this.particleManager.triggerImpactExplosion(target.data.position.x, target.data.position.y, true);
          }
        }

        for (const shotTarget of targets) {
          this.projectileManager.fire(
            tower.data.position,
            shotTarget.data,
            damage,
            color,
            speed,
            radius,
            splashRadius,
            undefined,
            isCrit,
            tower.data.type,
            armorPenetration,
            tower
          );
        }
        tower.data.cooldownTimer = tower.data.onSproutTile ? Math.floor(tower.data.fireRate / 2) : tower.data.fireRate;
      }
    }
  }

  /**
   * Desenha os tiles Overgrowth Sprout. Chamado logo após o mapa, antes das
   * torres: sem marcação visível o bônus existiria sem o jogador poder buscá-lo.
   */
  public renderSproutTiles(ctx: CanvasRenderingContext2D, tileSize: number) {
    if (this.sproutTiles.length === 0) return;

    ctx.save();
    for (const tile of this.sproutTiles) {
      const px = tile.x * tileSize;
      const py = tile.y * tileSize;
      const occupied = this.getTowerAt(tile.x, tile.y) !== undefined;

      ctx.globalAlpha = occupied ? 0.28 : 0.6;
      ctx.fillStyle = 'rgba(124, 179, 66, 0.35)';
      ctx.fillRect(px, py, tileSize, tileSize);

      ctx.strokeStyle = '#8bc34a';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(px + 1.5, py + 1.5, tileSize - 3, tileSize - 3);
      ctx.setLineDash([]);

      if (!occupied) {
        ctx.globalAlpha = 1;
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#c5e1a5';
        ctx.fillText('🌱', px + tileSize / 2, py + tileSize / 2 + 6);
      }
    }
    ctx.restore();
  }

  /**
   * Desenha os tiles Altar Obscuro no Grave Pass (MAP_4).
   */
  public renderDarkAltarTiles(ctx: CanvasRenderingContext2D, tileSize: number) {
    if (this.darkAltarTiles.length === 0) return;

    ctx.save();
    for (const tile of this.darkAltarTiles) {
      const px = tile.x * tileSize;
      const py = tile.y * tileSize;
      const occupied = this.getTowerAt(tile.x, tile.y) !== undefined;

      ctx.globalAlpha = occupied ? 0.3 : 0.65;
      ctx.fillStyle = 'rgba(142, 36, 170, 0.35)';
      ctx.fillRect(px, py, tileSize, tileSize);

      ctx.strokeStyle = '#ab47bc';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(px + 1.5, py + 1.5, tileSize - 3, tileSize - 3);
      ctx.setLineDash([]);

      if (!occupied) {
        ctx.globalAlpha = 1;
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ce93d8';
        ctx.fillText('💀', px + tileSize / 2, py + tileSize / 2 + 6);
      }
    }
    ctx.restore();
  }

  public render(ctx: CanvasRenderingContext2D, mousePos: { x: number; y: number } | null) {
    // Render Solar Prism Laser Beams
    for (const tower of this.towers) {
      if (tower.data.type === 'SOLAR_PRISM' && tower.data.laserTargetId && tower.data.laserTargetPos) {
        // Aponta para a posição real do alvo (antes o feixe era um traço fixo para cima)
        const tp = tower.data.laserTargetPos;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tower.data.position.x, tower.data.position.y);
        ctx.lineTo(tp.x + (Math.random() * 4 - 2), tp.y + (Math.random() * 4 - 2));
        ctx.strokeStyle = '#ffff8d';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const tower of this.towers) {
      let isHovered = false;
      if (mousePos) {
        const dx = mousePos.x - tower.data.position.x;
        const dy = mousePos.y - tower.data.position.y;
        isHovered = Math.hypot(dx, dy) < this.mapManager.tileSize / 2;
      }
      const isSelected = this.selectedTower === tower;
      tower.render(ctx, isSelected, isHovered, this.showAllRanges);
    }
  }
}
