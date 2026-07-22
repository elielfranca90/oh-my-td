import * as THREE from 'three';
import type { IEnemy } from './types';

export class Enemy {
  public mesh: THREE.Mesh;
  public data: IEnemy;

  constructor(waypoints: THREE.Vector3[], id: string) {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(waypoints[0].x, 0.25, waypoints[0].z);

    this.data = {
      id,
      hp: 10,
      speed: 0.05,
      waypointIndex: 0,
      position: this.mesh.position.clone(),
      mesh: this.mesh,
      isDead: false,
    };
  }

  public update(waypoints: THREE.Vector3[]): boolean {
    if (this.data.isDead) return false;

    const target = waypoints[this.data.waypointIndex + 1];
    if (!target) return true; // Reached end

    const direction = new THREE.Vector3().subVectors(target, this.mesh.position).normalize();
    this.mesh.position.add(direction.multiplyScalar(this.data.speed));

    if (this.mesh.position.distanceTo(target) < 0.1) {
      this.data.waypointIndex++;
    }

    this.data.position.copy(this.mesh.position);
    return false;
  }
}
