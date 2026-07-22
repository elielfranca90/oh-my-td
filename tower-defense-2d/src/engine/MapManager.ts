import type { Vector2D } from '../types';
import { SpriteManager } from './SpriteManager';

export const TileType = {
  BUILDABLE: 0,
  PATH: 1,
  OBSTACLE_MOUNTAIN: 2,
  OBSTACLE_FOREST: 3,
} as const;
export type TileType = typeof TileType[keyof typeof TileType];

export type MapId = 'MAP_1' | 'MAP_2' | 'MAP_3';

export class MapManager2D {
  public readonly cols = 14;
  public readonly rows = 10;
  public readonly tileSize = 60; // 840x600 canvas resolution
  private spriteManager: SpriteManager;

  public currentMapId: MapId = 'MAP_1';
  private mapData: TileType[][] = [];

  constructor(mapId: MapId = 'MAP_1') {
    this.spriteManager = new SpriteManager();
    this.setMap(mapId);
  }

  public setMap(mapId: MapId) {
    this.currentMapId = mapId;
    switch (mapId) {
      case 'MAP_2':
        this.mapData = this.getMap2Data();
        break;
      case 'MAP_3':
        this.mapData = this.getMap3Data();
        break;
      case 'MAP_1':
      default:
        this.mapData = this.getMap1Data();
        break;
    }
  }

  // --- MAP 1: DESFILADEIRO VERDE (S-Path) ---
  private getMap1Data(): TileType[][] {
    return [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 3, 3, 0, 0, 0, 3, 3, 0, 0, 0, 1, 0],
      [0, 0, 3, 3, 0, 0, 0, 3, 3, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1, 0],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ];
  }

  // --- MAP 2: VALE DA MORTE (Dual Spawn) ---
  private getMap2Data(): TileType[][] {
    return [
      [2, 1, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 1, 2], // Spawns at (1,0) and (12,0)
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 3, 3, 0, 0, 0, 3, 3, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // Merge at Row 3
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 3, 0, 0, 0, 1, 0, 0, 0, 3, 3, 0, 0],
      [0, 3, 3, 0, 0, 0, 1, 0, 0, 0, 3, 3, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [2, 2, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 2, 2],
      [2, 2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2], // Base at (3,9) or (9,9)
    ];
  }

  // --- MAP 3: CIDADELA (Short High-Speed Route) ---
  private getMap3Data(): TileType[][] {
    return [
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 1, 0],
      [0, 3, 2, 2, 2, 2, 2, 2, 2, 3, 0, 0, 1, 0],
      [0, 3, 2, 0, 0, 0, 0, 0, 2, 3, 0, 0, 1, 0],
      [0, 3, 2, 0, 0, 0, 0, 0, 2, 3, 0, 0, 1, 0],
      [0, 3, 2, 2, 2, 2, 2, 2, 2, 3, 0, 0, 1, 0],
      [0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ];
  }

  public render(ctx: CanvasRenderingContext2D) {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const type = this.mapData[row][col];
        this.spriteManager.drawTile(ctx, type, col * this.tileSize, row * this.tileSize);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize);
      }
    }
  }

  public isBuildable(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return false;
    return this.mapData[gridY][gridX] === TileType.BUILDABLE;
  }

  public getWaypoints(pathIndex = 0): Vector2D[] {
    const half = this.tileSize / 2;

    if (this.currentMapId === 'MAP_2') {
      // Dual Spawn
      if (pathIndex === 1) {
        // Right Portal Spawn
        return [
          { x: 12 * this.tileSize + half, y: 0 * this.tileSize + half },
          { x: 12 * this.tileSize + half, y: 3 * this.tileSize + half },
          { x: 6 * this.tileSize + half, y: 3 * this.tileSize + half },
          { x: 6 * this.tileSize + half, y: 7 * this.tileSize + half },
          { x: 9 * this.tileSize + half, y: 7 * this.tileSize + half },
          { x: 9 * this.tileSize + half, y: 9 * this.tileSize + half },
        ];
      }
      // Left Portal Spawn
      return [
        { x: 1 * this.tileSize + half, y: 0 * this.tileSize + half },
        { x: 1 * this.tileSize + half, y: 3 * this.tileSize + half },
        { x: 6 * this.tileSize + half, y: 3 * this.tileSize + half },
        { x: 6 * this.tileSize + half, y: 7 * this.tileSize + half },
        { x: 3 * this.tileSize + half, y: 7 * this.tileSize + half },
        { x: 3 * this.tileSize + half, y: 9 * this.tileSize + half },
      ];
    }

    if (this.currentMapId === 'MAP_3') {
      // Citadel Short Perimeter Path
      return [
        { x: 1 * this.tileSize + half, y: 0 * this.tileSize + half },
        { x: 12 * this.tileSize + half, y: 0 * this.tileSize + half },
        { x: 12 * this.tileSize + half, y: 8 * this.tileSize + half },
        { x: 1 * this.tileSize + half, y: 8 * this.tileSize + half },
        { x: 1 * this.tileSize + half, y: 9 * this.tileSize + half },
      ];
    }

    // Map 1 Default
    return [
      { x: 1 * this.tileSize + half, y: 1 * this.tileSize + half },  // (1,1)
      { x: 12 * this.tileSize + half, y: 1 * this.tileSize + half }, // (12,1)
      { x: 12 * this.tileSize + half, y: 4 * this.tileSize + half }, // (12,4)
      { x: 1 * this.tileSize + half, y: 4 * this.tileSize + half },  // (1,4)
      { x: 1 * this.tileSize + half, y: 7 * this.tileSize + half },  // (1,7)
      { x: 12 * this.tileSize + half, y: 7 * this.tileSize + half }, // (12,7)
      { x: 12 * this.tileSize + half, y: 8 * this.tileSize + half }, // (12,8)
    ];
  }
}
