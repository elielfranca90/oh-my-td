import type { Vector2D } from '../types';

export const TileType = {
  BUILDABLE: 0,
  PATH: 1,
} as const;
export type TileType = typeof TileType[keyof typeof TileType];

export class MapManager2D {
  public readonly cols = 14;
  public readonly rows = 10;
  public readonly tileSize = 60; // 840x600 canvas resolution

  // 14x10 Grid - Extended S-Path
  private mapData: TileType[][] = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 1: x=1..12
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // 2: x=12
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // 3: x=12
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 4: x=1..12
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 5: x=1
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 6: x=1
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 7: x=1..12
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // 8: x=12 (Base)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 9
  ];

  public render(ctx: CanvasRenderingContext2D) {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const type = this.mapData[row][col];
        ctx.fillStyle = type === TileType.BUILDABLE ? '#2e7d32' : '#424242';
        ctx.fillRect(col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize);

        // Grid lines
        ctx.strokeStyle = '#1b5e20';
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
