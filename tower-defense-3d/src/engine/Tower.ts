import * as THREE from 'three';
import type { ITower } from './types';

export class Tower {
  public mesh: THREE.Mesh;
  public data: ITower;

  constructor(x: number, z: number, id: string) {
    const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0x0000FF });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, 0.6, z);

    this.data = {
      id,
      gridX: x,
      gridZ: z,
      range: 3,
      fireRate: 1,
      cooldownTimer: 0,
      position: this.mesh.position.clone(),
      mesh: this.mesh,
    };
  }
}
