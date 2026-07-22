import * as THREE from 'three';

export const TileType = {
  BUILDABLE: 0,
  PATH: 1,
} as const;
export type TileType = typeof TileType[keyof typeof TileType];

export class MapManager {
  private scene: THREE.Scene;
  private readonly size = 10;
  private readonly tileSize = 1;
  private mapData: TileType[][] = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
  public getPath(): THREE.Vector3[] {
    return [
      new THREE.Vector3(1, 0, 1),
      new THREE.Vector3(7, 0, 1),
      new THREE.Vector3(7, 0, 4),
      new THREE.Vector3(1, 0, 4),
      new THREE.Vector3(1, 0, 7),
      new THREE.Vector3(8, 0, 7),
      new THREE.Vector3(8, 0, 8),
    ];
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.renderMap();
  }

  private renderMap() {
    const buildableMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const pathMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const geometry = new THREE.BoxGeometry(this.tileSize, 0.2, this.tileSize);

    for (let z = 0; z < this.size; z++) {
      for (let x = 0; x < this.size; x++) {
        const type = this.mapData[z][x];
        const material = type === TileType.BUILDABLE ? buildableMaterial : pathMaterial;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x * this.tileSize, 0.1, z * this.tileSize);
        this.scene.add(mesh);
      }
    }
  }
  public isBuildable(x: number, z: number): boolean {
    if (x < 0 || x >= this.size || z < 0 || z >= this.size) return false;
    return this.mapData[z][x] === TileType.BUILDABLE;
  }
}
