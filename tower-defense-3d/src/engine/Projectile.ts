import * as THREE from 'three';
import type { IEnemy } from './types';

export class Projectile {
  public mesh: THREE.Mesh;
  public target: IEnemy;
  public damage = 5;
  public speed = 0.2;
  public hasHit = false;

  constructor(position: THREE.Vector3, target: IEnemy) {
    const geometry = new THREE.SphereGeometry(0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.target = target;
  }

  public update(): boolean {
    if (this.target.isDead) return true;
    
    const direction = new THREE.Vector3().subVectors(this.target.mesh.position, this.mesh.position).normalize();
    this.mesh.position.add(direction.multiplyScalar(this.speed));

    if (this.mesh.position.distanceTo(this.target.mesh.position) < 0.2) {
      this.target.hp -= this.damage;
      if (this.target.hp <= 0) this.target.isDead = true;
      return true;
    }
    return false;
  }
}
