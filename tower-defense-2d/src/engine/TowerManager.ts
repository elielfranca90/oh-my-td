import type { TowerType } from '../types';
import { AchievementManager } from './AchievementManager';
import { EventBus } from './EventBus';
import { AnalyticsManager } from './AnalyticsManager';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { GameState } from './GameState';
import { MapManager2D } from './MapManager';
import { ParticleManager } from './ParticleManager';
import { ProjectileManager2D } from './ProjectileManager';
import { TalentManager } from './TalentManager';
import { Tower2D } from './Tower';

export class TowerManager2D {
  private towers: Tower2D[] = [];
  private mapManager: MapManager2D;
  private projectileManager: ProjectileManager2D;
  private gameState: GameState;
  private audioManager: AudioManager;
  private particleManager?: ParticleManager;
  private talentManager?: TalentManager;
  private achievementManager?: AchievementManager;
  private analyticsManager?: AnalyticsManager;
  public selectedBuildType: TowerType = 'BASIC';
  public selectedTower: Tower2D | null = null;
  public sproutTiles: { x: number; y: number }[] = [];

  constructor(
    mapManager: MapManager2D,
    projectileManager: ProjectileManager2D,
    gameState: GameState,
    audioManager: AudioManager,
    particleManager?: ParticleManager,
    talentManager?: TalentManager,
    analyticsManager?: AnalyticsManager,
    achievementManager?: AchievementManager
  ) {
    this.mapManager = mapManager;
    this.projectileManager = projectileManager;
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.particleManager = particleManager;
    this.talentManager = talentManager;
    this.analyticsManager = analyticsManager;
    this.achievementManager = achievementManager;
  }

  public setParticleManager(pm: ParticleManager) {
    this.particleManager = pm;
  }

  public getTowerAt(gridX: number, gridY: number): Tower2D | undefined {
    return this.towers.find(t => t.data.gridX === gridX && t.data.gridY === gridY);
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

    const tower = new Tower2D(gridX, gridY, this.mapManager.tileSize, this.selectedBuildType, `tower-${Date.now()}`);

    // Check Overgrowth Sprout Twist (+25% range bonus)
    const isSproutTile = this.sproutTiles.some(s => s.x === gridX && s.y === gridY);
    if (isSproutTile) {
      tower.data.onSproutTile = true;
      tower.data.range = Math.round(tower.data.range * 1.25);
    }

    // Apply Talent Damage Bonus if unlocked
    if (this.talentManager) {
      tower.data.damage = Math.round(tower.data.damage * this.talentManager.getDamageBonusMultiplier());
    }

    this.towers.push(tower);
    this.selectedTower = tower;
    EventBus.getInstance().emit('tower:select', this.selectedTower);
    return true;
  }

  public upgradeSelectedTower(): boolean {
    if (!this.selectedTower) return false;
    const cost = this.selectedTower.getUpgradeCost();
    if (this.selectedTower.data.level >= 3) return false;

    if (this.gameState.spendGold(cost)) {
      if (this.analyticsManager) {
        this.analyticsManager.recordGoldSpent(cost);
      }
      const upgraded = this.selectedTower.upgrade();
      if (upgraded) {
        EventBus.getInstance().emit('tower:select', this.selectedTower);
      }
      return upgraded;
    }
    return false;
  }

  public sellSelectedTower(): boolean {
    if (!this.selectedTower) return false;
    const refund = this.selectedTower.getSellValue();
    this.gameState.addGold(refund);

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
    const cost = this.selectedTower.getRepairCost(this.talentManager);
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

  public update(enemies: Enemy2D[], fxManager?: FXManager) {
    for (const tower of this.towers) {
      const readyToShoot = tower.update();
      if (!readyToShoot) continue;

      // Filter in-range enemies
      const inRangeEnemies = enemies.filter(e => {
        if (e.data.isDead) return false;
        const dx = e.data.position.x - tower.data.position.x;
        const dy = e.data.position.y - tower.data.position.y;
        return Math.hypot(dx, dy) <= tower.data.range;
      });

      if (inRangeEnemies.length === 0) {
        tower.data.laserTargetId = undefined;
        tower.data.laserTargetPos = undefined;
        tower.data.beamDuration = 0;
        continue;
      }

      // 1. Frost Tower: AoE Glacial Pulse
      if (tower.data.type === 'FROST') {
        this.audioManager.playFrostShot();
        for (const enemy of inRangeEnemies) {
          const dmgDealt = enemy.takeDamage(tower.data.damage, true);
          if (dmgDealt > 0 && this.analyticsManager) {
            this.analyticsManager.recordDamage('FROST', dmgDealt);
          }
          enemy.applySlow(tower.data.slowFactor || 0.5, 120);
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
        // 2. Solar Prism Laser Beam (Focus mechanic: +10% damage per sec)
        if (tower.data.type === 'SOLAR_PRISM') {
          if (tower.data.laserTargetId === target.data.id) {
            tower.data.beamDuration = (tower.data.beamDuration || 0) + 1;
          } else {
            tower.data.laserTargetId = target.data.id;
            tower.data.beamDuration = 0;
          }
          tower.data.laserTargetPos = { ...target.data.position };

          const focusBonus = Math.min(1.0, Math.floor((tower.data.beamDuration || 0) / 60) * 0.1);
          const laserDmg = Math.round(tower.data.damage * (1 + focusBonus));

          const dmgDealt = target.takeDamage(laserDmg, false);
          if (dmgDealt > 0 && this.analyticsManager) {
            this.analyticsManager.recordDamage('SOLAR_PRISM', dmgDealt);
          }

          if (fxManager && Math.random() < 0.3) {
            fxManager.addDamageText(target.data.position.x, target.data.position.y, `-${dmgDealt}`, '#ffff8d');
          }

          tower.data.cooldownTimer = Math.max(8, tower.data.onSproutTile ? 12 : 24);
          continue;
        }

        let damage = tower.data.damage;
        let color = '#ffeb3b';
        let speed = 9;
        let radius = 4;
        let splashRadius: number | undefined;
        let isCrit = false;

        const extraCritChance = this.talentManager ? this.talentManager.getCritChance() : 0;

        if (tower.data.type === 'BASIC') {
          // 20% Base Critical Hit chance + Talent Crit Chance
          if (Math.random() < (0.20 + extraCritChance)) {
            damage *= 2;
            isCrit = true;
            color = '#ffea00';
          }
          this.audioManager.playBasicShot();
        } else if (tower.data.type === 'CANNON') {
          // Executioner (+100% damage against Tanks & Bosses > 50% HP)
          const targetHpRatio = target.data.hp / target.data.maxHp;
          if ((target.data.type === 'TANK' || target.data.type === 'BOSS') && targetHpRatio >= 0.5) {
            damage *= 2;
            isCrit = true;
          } else if (extraCritChance > 0 && Math.random() < extraCritChance) {
            damage *= 2;
            isCrit = true;
          }
          color = '#ff5722';
          speed = 6;
          radius = 7;
          this.audioManager.playCannonShot();
        } else if (tower.data.type === 'ARTILLERY') {
          if (extraCritChance > 0 && Math.random() < extraCritChance) {
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

        this.projectileManager.fire(
          tower.data.position,
          target.data,
          damage,
          color,
          speed,
          radius,
          splashRadius,
          undefined,
          isCrit,
          tower.data.type
        );
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
      tower.render(ctx, isSelected, isHovered);
    }
  }
}
