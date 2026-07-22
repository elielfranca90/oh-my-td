import type { Vector2D } from '../types';
import { SpriteManager } from './SpriteManager';

export const TileType = {
  BUILDABLE: 0,
  PATH: 1,
  OBSTACLE_MOUNTAIN: 2,
  OBSTACLE_FOREST: 3,
} as const;
export type TileType = typeof TileType[keyof typeof TileType];

export class MapManager2D {
  public readonly cols = 14;
  public readonly rows = 10;
  public readonly tileSize = 60; // 840x600 canvas resolution
  private spriteManager: SpriteManager;

  // 14x10 Grid with Natural Obstacles (Mountains = 2, Forests = 3)
  private mapData: TileType[][] = [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 0: Mountain ridge at top
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 1: Path (1,1) to (12,1)
    [0, 0, 3, 3, 0, 0, 0, 3, 3, 0, 0, 0, 1, 0], // 2: Forests & Grass
    [0, 0, 3, 3, 0, 0, 0, 3, 3, 0, 0, 0, 1, 0], // 3: Forests & Grass
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 4: Path (12,4) to (1,4)
    [0, 1, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0], // 5: Central Forest Cluster
    [0, 1, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0], // 6: Central Forest Cluster
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 7: Path (1,7) to (12,7)
    [0, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1, 0], // 8: Mountains at bottom + Base
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 9: Mountain ridge at bottom
  ];

  constructor() {
    this.spriteManager = new SpriteManager();
  }

  public render(ctx: CanvasRenderingContext2D) {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const type = this.mapData[row][col];

        // Blit pre-rendered texture tile from SpriteManager
        this.spriteManager.drawTile(ctx, type, col * this.tileSize, row * this.tileSize);

        // Subtle Grid border
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

  public getWaypoints(): Vector2D[] {
    const half = this.tileSize / 2;
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
