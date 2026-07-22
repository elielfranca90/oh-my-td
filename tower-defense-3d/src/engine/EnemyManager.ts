import * as THREE from 'three';
import { Enemy } from './Enemy';

export class EnemyManager {
  private enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private waypoints: THREE.Vector3[];
  private spawnTimer = 0;

  constructor(scene: THREE.Scene, waypoints: THREE.Vector3[]) {
    this.scene = scene;
    this.waypoints = waypoints;
  }

  public update(deltaTime: number) {
    this.spawnTimer += deltaTime;
    if (this.spawnTimer > 2) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const reachedEnd = this.enemies[i].update(this.waypoints);
      if (reachedEnd || this.enemies[i].data.isDead) {
        this.scene.remove(this.enemies[i].mesh);
        this.enemies.splice(i, 1);
      }
    }
  }

  private spawnEnemy() {
    const enemy = new Enemy(this.waypoints, `enemy-${Date.now()}`);
    this.enemies.push(enemy);
    this.scene.add(enemy.mesh);
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }
}
