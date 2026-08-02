import * as THREE from 'three';
import type { MapId, TileType } from './MapManager';
import type { SpriteManager } from './SpriteManager';

export class ThreeRenderer {
  public readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mapGroup: THREE.Group;

  private materials: THREE.MeshBasicMaterial[] = [];
  private textures: THREE.CanvasTexture[] = [];
  private tileGeometry: THREE.PlaneGeometry | null = null;
  private height: number;

  constructor(width = 840, height = 600) {
    this.height = height;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    let dummyCanvas: HTMLCanvasElement | null = null;

    try {
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      this.renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
      this.renderer.setSize(width, height, false);
      this.canvas = this.renderer.domElement;
    } catch {
      // Fallback para ambientes sem suporte WebGL (ex: testes em happy-dom/node)
      dummyCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : ({} as HTMLCanvasElement);
      dummyCanvas.width = width;
      dummyCanvas.height = height;
      this.canvas = dummyCanvas;
      this.renderer = null;
    }

    if (this.canvas && this.canvas.style) {
      this.canvas.style.position = 'absolute';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.left = '50%';
      this.canvas.style.top = '50%';
      this.canvas.style.transform = 'translate(-50%, -50%)';
      this.canvas.style.zIndex = '0';
    }
  }

  public buildMap(mapData: TileType[][], mapId: MapId, spriteManager: SpriteManager, tileSize = 60) {
    this.clearMap();
    if (!this.renderer) return;

    const atlasCanvas = spriteManager.getAtlas(mapId);
    this.tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);

    // 4 tipos de tiles (0: BUILDABLE, 1: PATH, 2: OBSTACLE_MOUNTAIN, 3: OBSTACLE_FOREST)
    for (let t = 0; t < 4; t++) {
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = tileSize;
      tileCanvas.height = tileSize;
      const ctx = tileCanvas.getContext('2d');
      if (ctx && atlasCanvas) {
        ctx.drawImage(atlasCanvas, t * tileSize, 0, tileSize, tileSize, 0, 0, tileSize, tileSize);

        // Grade sutil (strokeRect) idêntica à renderização 2D anterior
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, tileSize, tileSize);
      }

      const texture = new THREE.CanvasTexture(tileCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      this.textures.push(texture);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
      });
      this.materials.push(material);
    }

    const rows = mapData.length;
    for (let r = 0; r < rows; r++) {
      const cols = mapData[r].length;
      for (let c = 0; c < cols; c++) {
        const tileType = mapData[r][c];
        const mat = this.materials[tileType] || this.materials[0];
        const mesh = new THREE.Mesh(this.tileGeometry, mat);

        // Posiciona no centro do tile convertendo a coordenada de linha (top-down) para Y-up
        mesh.position.set(c * tileSize + tileSize / 2, this.height - (r * tileSize + tileSize / 2), 0);
        this.mapGroup.add(mesh);
      }
    }
  }

  public clearMap() {
    while (this.mapGroup.children.length > 0) {
      const child = this.mapGroup.children.pop();
      if (child) {
        this.mapGroup.remove(child);
      }
    }

    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials = [];

    for (const tex of this.textures) {
      tex.dispose();
    }
    this.textures = [];

    if (this.tileGeometry) {
      this.tileGeometry.dispose();
      this.tileGeometry = null;
    }
  }

  public render() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.clearMap();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
