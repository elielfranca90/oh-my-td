import { MapManager } from './MapManager';
import { EnemyManager } from './EnemyManager';
import { TowerManager } from './TowerManager';
import { ProjectileManager } from './ProjectileManager';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mapManager: MapManager;
  private towerManager: TowerManager;
  private enemyManager: EnemyManager;
  private projectileManager: ProjectileManager;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.camera.position.set(10, 10, 10);
    this.controls.update();

    this.setupLights();
    this.mapManager = new MapManager(this.scene);
    this.projectileManager = new ProjectileManager(this.scene);
    this.towerManager = new TowerManager(this.scene, this.mapManager, this.projectileManager);
    this.enemyManager = new EnemyManager(this.scene, this.mapManager.getPath());

    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('click', this.onPointerClick.bind(this));
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onPointerClick(event: MouseEvent) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const x = Math.round(point.x);
      const z = Math.round(point.z);
      this.towerManager.placeTower(x, z);
    }
  }

  public run() {
    requestAnimationFrame(this.run.bind(this));
    this.enemyManager.update(0.016);
    this.towerManager.update(this.enemyManager.getEnemies());
    this.projectileManager.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
