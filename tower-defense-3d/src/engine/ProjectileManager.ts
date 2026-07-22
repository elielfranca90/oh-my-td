import * as THREE from 'three';
import { Projectile } from './Projectile';
import type { IEnemy } from './types';

export class ProjectileManager {
  private projectiles: Projectile[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public fire(position: THREE.Vector3, target: IEnemy) {
    const projectile = new Projectile(position, target);
    this.projectiles.push(projectile);
    this.scene.add(projectile.mesh);
  }

  public update() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const reachedTarget = this.projectiles[i].update();
      if (reachedTarget) {
        this.scene.remove(this.projectiles[i].mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
}
