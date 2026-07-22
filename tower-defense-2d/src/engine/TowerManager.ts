import type { TowerType } from '../types';
import { AudioManager } from './AudioManager';
import { Enemy2D } from './Enemy';
import { GameState } from './GameState';
import { MapManager2D } from './MapManager';
import { ParticleManager } from './ParticleManager';
import { ProjectileManager2D } from './ProjectileManager';
import { Tower2D } from './Tower';

export class TowerManager2D {
  private towers: Tower2D[] = [];
  private mapManager: MapManager2D;
  private projectileManager: ProjectileManager2D;
  private gameState: GameState;
  private audioManager: AudioManager;
  private particleManager?: ParticleManager;

  public selectedBuildType: TowerType = 'BASIC';
  public selectedTower: Tower2D | null = null;

  constructor(
    mapManager: MapManager2D,
    projectileManager: ProjectileManager2D,
    gameState: GameState,
    audioManager: AudioManager,
    particleManager?: ParticleManager
  ) {
    this.mapManager = mapManager;
    this.projectileManager = projectileManager;
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.particleManager = particleManager;
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
      case 'CANNON': return 90;
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

    const tower = new Tower2D(gridX, gridY, this.mapManager.tileSize, this.selectedBuildType, `tower-${Date.now()}`);
    this.towers.push(tower);
    this.selectedTower = tower;
    return true;
  }

  public upgradeSelectedTower(): boolean {
    if (!this.selectedTower) return false;
    const cost = this.selectedTower.getUpgradeCost();
    if (this.selectedTower.data.level >= 3) return false;

    if (this.gameState.spendGold(cost)) {
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

  public update(enemies: Enemy2D[]) {
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

      if (inRangeEnemies.length === 0) continue;

      // 1. Frost Tower: AoE Glacial Pulse (Pulse damage & slow to ALL enemies in range)
      if (tower.data.type === 'FROST') {
        this.audioManager.playFrostShot();
        for (const enemy of inRangeEnemies) {
          enemy.takeDamage(tower.data.damage, true);
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
        let damage = tower.data.damage;
        let color = '#ffeb3b';
        let speed = 9;
        let radius = 4;
        let splashRadius: number | undefined;
        let isCrit = false;

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
          isCrit
        );
        tower.data.cooldownTimer = tower.data.fireRate;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, mousePos: { x: number; y: number } | null) {
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
