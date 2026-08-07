import type { TowerType } from '../types';
import { AnalyticsManager } from './AnalyticsManager';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { FXManager } from './FXManager';
import { GameState } from './GameState';
import { createId } from './ids';
import { MapManager2D } from './MapManager';
import { ParticleManager } from './ParticleManager';
import { ProjectileManager2D } from './ProjectileManager';
import { TalentManager } from './TalentManager';
import { Tower2D } from './Tower';

/** Simulation steps of continuous focus needed for each +10% Solar Prism damage tier. */
const SOLAR_FOCUS_STEPS_PER_TIER = 60;

export class TowerManager2D {
  private towers: Tower2D[] = [];
  private mapManager: MapManager2D;
  private projectileManager: ProjectileManager2D;
  private gameState: GameState;
  private audioManager: AudioManager;
  private particleManager?: ParticleManager;
  private talentManager?: TalentManager;
  private analyticsManager?: AnalyticsManager;

  /** Reused between frames so target selection allocates nothing per tower per step. */
  private readonly inRangeBuffer: Enemy2D[] = [];

  public selectedBuildType: TowerType = 'BASIC';
  public selectedTower: Tower2D | null = null;

  constructor(
    mapManager: MapManager2D,
    projectileManager: ProjectileManager2D,
    gameState: GameState,
    audioManager: AudioManager,
    particleManager?: ParticleManager,
    talentManager?: TalentManager,
    analyticsManager?: AnalyticsManager
  ) {
    this.mapManager = mapManager;
    this.projectileManager = projectileManager;
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.particleManager = particleManager;
    this.talentManager = talentManager;
    this.analyticsManager = analyticsManager;
  }

  public getTowerAt(gridX: number, gridY: number): Tower2D | undefined {
    return this.towers.find(t => t.data.gridX === gridX && t.data.gridY === gridY);
  }

  public getTowerCost(type: TowerType): number {
    switch (type) {
      case 'ARTILLERY': return 110;
      case 'CANNON': return 90;
      case 'SOLAR_PRISM': return 80;
      case 'FROST': return 70;
      case 'BASIC':
      default: return 50;
    }
  }

  public placeTower(gridX: number, gridY: number): boolean {
    const existing = this.getTowerAt(gridX, gridY);
    if (existing) {
      this.selectedTower = existing;
      return true;
    }

    this.selectedTower = null;

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

    const tower = new Tower2D(gridX, gridY, this.mapManager.tileSize, this.selectedBuildType, createId('tower'));

    // Apply Talent Damage Bonus if unlocked
    if (this.talentManager) {
      tower.data.damage = Math.round(tower.data.damage * this.talentManager.getDamageBonusMultiplier());
    }

    this.towers.push(tower);
    this.selectedTower = tower;
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
      return this.selectedTower.upgrade();
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
    return true;
  }

  public cycleSelectedTowerTargeting() {
    if (this.selectedTower) {
      this.selectedTower.cycleTargeting();
    }
  }

  /** Fills `inRangeBuffer` with living enemies inside the tower's radius. */
  private collectInRange(tower: Tower2D, enemies: Enemy2D[]): Enemy2D[] {
    const buffer = this.inRangeBuffer;
    buffer.length = 0;

    // Squared comparison avoids a sqrt per enemy per tower per step.
    const rangeSq = tower.data.range * tower.data.range;
    for (const enemy of enemies) {
      if (enemy.data.isDead) continue;
      const dx = enemy.data.position.x - tower.data.position.x;
      const dy = enemy.data.position.y - tower.data.position.y;
      if (dx * dx + dy * dy <= rangeSq) buffer.push(enemy);
    }

    return buffer;
  }

  private selectTarget(tower: Tower2D, inRange: Enemy2D[]): Enemy2D {
    switch (tower.data.targeting) {
      case 'STRONGEST':
        return inRange.reduce((prev, curr) => (curr.data.hp > prev.data.hp ? curr : prev));
      case 'WEAKEST':
        return inRange.reduce((prev, curr) => (curr.data.hp < prev.data.hp ? curr : prev));
      case 'LAST':
        return inRange.reduce((prev, curr) => (curr.data.waypointIndex < prev.data.waypointIndex ? curr : prev));
      case 'FIRST':
      default:
        return inRange.reduce((prev, curr) => (curr.data.waypointIndex > prev.data.waypointIndex ? curr : prev));
    }
  }

  public update(enemies: Enemy2D[], fxManager: FXManager) {
    for (const tower of this.towers) {
      const readyToShoot = tower.update();
      if (!readyToShoot) continue;

      const inRangeEnemies = this.collectInRange(tower, enemies);

      if (inRangeEnemies.length === 0) {
        tower.data.laserTargetId = undefined;
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
        tower.resetCooldown();
        continue;
      }

      const target = this.selectTarget(tower, inRangeEnemies);

      // 2. Solar Prism Laser Beam (Focus mechanic: +10% damage per second of focus)
      if (tower.data.type === 'SOLAR_PRISM') {
        const cooldownSteps = tower.getEffectiveFireRate();

        if (tower.data.laserTargetId === target.data.id) {
          // beamDuration counts SIMULATION STEPS of focus, not shots. It used to be
          // incremented by 1 per shot while being divided by 60, so the advertised
          // "+10% per second" only landed after ~24s and +100% needed 4 minutes.
          tower.data.beamDuration = (tower.data.beamDuration || 0) + cooldownSteps;
        } else {
          tower.data.laserTargetId = target.data.id;
          tower.data.beamDuration = 0;
        }

        const focusTiers = Math.floor((tower.data.beamDuration || 0) / SOLAR_FOCUS_STEPS_PER_TIER);
        const focusBonus = Math.min(1.0, focusTiers * 0.1);
        const laserDmg = Math.round(tower.data.damage * (1 + focusBonus));

        const dmgDealt = target.takeDamage(laserDmg, false);
        if (dmgDealt > 0 && this.analyticsManager) {
          this.analyticsManager.recordDamage('SOLAR_PRISM', dmgDealt);
        }

        if (dmgDealt === -1) {
          fxManager.addDamageText(target.data.position.x, target.data.position.y, 'DODGED!', '#ff9800');
        } else if (Math.random() < 0.3) {
          fxManager.addDamageText(target.data.position.x, target.data.position.y, `-${dmgDealt}`, '#ffff8d');
        }

        tower.resetCooldown();
        continue;
      }

      let damage = tower.data.damage;
      let color = '#ffeb3b';
      let speed = 9;
      let radius = 4;
      let splashRadius: number | undefined;
      let isCrit = false;
      let onImpact: ((x: number, y: number) => void) | undefined;

      if (tower.data.type === 'BASIC') {
        // 20% Critical Hit chance (2x damage)
        if (Math.random() < 0.20) {
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
        }
        color = '#ff5722';
        speed = 6;
        radius = 7;
        this.audioManager.playCannonShot();
      } else if (tower.data.type === 'ARTILLERY') {
        color = '#ea80fc';
        speed = 5;
        radius = 9;
        splashRadius = tower.data.splashRadius;
        this.audioManager.playArtilleryShot();

        // The napalm patch is spawned when the shell lands, not when it leaves the barrel:
        // against fast targets the fire used to appear 120+ px away from the impact.
        const particleManager = this.particleManager;
        if (particleManager) {
          onImpact = (x, y) => particleManager.triggerImpactExplosion(x, y, true);
        }
      }

      this.projectileManager.fire(tower.data.position, target.data, damage, {
        color,
        speed,
        radius,
        splashRadius,
        isCrit,
        towerType: tower.data.type,
        onImpact,
      });
      tower.resetCooldown();
    }
  }

  public render(ctx: CanvasRenderingContext2D, mousePos: { x: number; y: number } | null, enemies: Enemy2D[]) {
    // Render Solar Prism Laser Beams towards their actual target (it used to be a fixed
    // 40 px vertical stub that ignored where the enemy was).
    for (const tower of this.towers) {
      if (tower.data.type !== 'SOLAR_PRISM' || !tower.data.laserTargetId) continue;

      const target = enemies.find(e => e.data.id === tower.data.laserTargetId && !e.data.isDead);
      if (!target) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tower.data.position.x, tower.data.position.y);
      ctx.lineTo(
        target.data.position.x + (Math.random() * 6 - 3),
        target.data.position.y + (Math.random() * 6 - 3)
      );
      ctx.strokeStyle = '#ffff8d';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    const hoverRadiusSq = (this.mapManager.tileSize / 2) ** 2;
    for (const tower of this.towers) {
      let isHovered = false;
      if (mousePos) {
        const dx = mousePos.x - tower.data.position.x;
        const dy = mousePos.y - tower.data.position.y;
        isHovered = dx * dx + dy * dy < hoverRadiusSq;
      }
      const isSelected = this.selectedTower === tower;
      tower.render(ctx, isSelected, isHovered);
    }
  }
}
