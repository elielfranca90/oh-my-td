import * as THREE from 'three';

export interface IEnemy {
  id: string;
  hp: number;
  speed: number;
  waypointIndex: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  isDead: boolean;
}

export interface ITower {
  id: string;
  gridX: number;
  gridZ: number;
  range: number;
  fireRate: number;
  cooldownTimer: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
}

export interface IProjectile {
  id: string;
  targetEnemy: IEnemy;
  damage: number;
  speed: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  hasHit: boolean;
}
