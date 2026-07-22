import * as THREE from 'three';
import { Enemy } from './Enemy';
import { ProjectileManager } from './ProjectileManager';
import { Tower } from './Tower';
import { MapManager } from './MapManager';

export class TowerManager {
  private towers: Tower[] = [];
  private scene: THREE.Scene;
  private mapManager: MapManager;
  private projectileManager: ProjectileManager;

  constructor(scene: THREE.Scene, mapManager: MapManager, projectileManager: ProjectileManager) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.projectileManager = projectileManager;
  }

  public update(enemies: Enemy[]) {
    for (const tower of this.towers) {
      if (tower.data.cooldownTimer > 0) {
        tower.data.cooldownTimer -= 0.016;
        continue;
      }
      const target = enemies.find(e => !e.data.isDead && tower.data.position.distanceTo(e.mesh.position) < tower.data.range);
      if (target) {
        this.projectileManager.fire(tower.data.position, target.data);
        tower.data.cooldownTimer = tower.data.fireRate;
      }
    }
  }

  public placeTower(x: number, z: number): boolean {
    if (!this.mapManager.isBuildable(x, z) || this.isOccupied(x, z)) {
      return false;
    }

    const tower = new Tower(x, z, `tower-${Date.now()}`);
    this.towers.push(tower);
    this.scene.add(tower.mesh);
    return true;
  }

  private isOccupied(x: number, z: number): boolean {
    return this.towers.some((t) => t.data.gridX === x && t.data.gridZ === z);
  }
}
