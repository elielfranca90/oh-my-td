export class SpriteManager {
  private atlasCanvas: HTMLCanvasElement;
  private atlasCtx: CanvasRenderingContext2D;
  public readonly tileSize = 60;

  constructor() {
    this.atlasCanvas = document.createElement('canvas');
    this.atlasCanvas.width = this.tileSize * 4; // 4 tile variations
    this.atlasCanvas.height = this.tileSize;

    const ctx = this.atlasCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create atlas context');
    this.atlasCtx = ctx;

    this.generateAtlas();
  }

  private generateAtlas() {
    // Tile 0: BUILDABLE (Grass)
    this.drawGrassTile(0);

    // Tile 1: PATH (Gravel Path)
    this.drawPathTile(1 * this.tileSize);

    // Tile 2: MOUNTAIN OBSTACLE
    this.drawMountainTile(2 * this.tileSize);

    // Tile 3: FOREST OBSTACLE
    this.drawForestTile(3 * this.tileSize);
  }

  // 0: Grass Tile
  private drawGrassTile(offsetX: number) {
    const ctx = this.atlasCtx;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(offsetX, 0, this.tileSize, this.tileSize);

    // Subtle grass blades
    ctx.fillStyle = '#388e3c';
    const blades = [
      { x: 10, y: 15 }, { x: 25, y: 40 }, { x: 45, y: 10 }, { x: 50, y: 48 }, { x: 18, y: 52 }
    ];
    for (const b of blades) {
      ctx.fillRect(offsetX + b.x, b.y, 4, 6);
      ctx.fillRect(offsetX + b.x + 2, b.y - 2, 2, 4);
    }
  }

  // 1: Path Tile
  private drawPathTile(offsetX: number) {
    const ctx = this.atlasCtx;
    ctx.fillStyle = '#424242';
    ctx.fillRect(offsetX, 0, this.tileSize, this.tileSize);

    // Gravel texture details
    ctx.fillStyle = '#616161';
    const gravel = [
      { x: 8, y: 12 }, { x: 32, y: 8 }, { x: 20, y: 35 }, { x: 48, y: 28 }, { x: 14, y: 46 }, { x: 40, y: 48 }
    ];
    for (const g of gravel) {
      ctx.beginPath();
      ctx.arc(offsetX + g.x, g.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2: Mountain Obstacle Tile
  private drawMountainTile(offsetX: number) {
    const ctx = this.atlasCtx;
    // Base grass
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(offsetX, 0, this.tileSize, this.tileSize);

    // Mountain Rock Body
    ctx.beginPath();
    ctx.moveTo(offsetX + 10, 52);
    ctx.lineTo(offsetX + 30, 8);
    ctx.lineTo(offsetX + 50, 52);
    ctx.closePath();
    ctx.fillStyle = '#616161';
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mountain Shadow Side
    ctx.beginPath();
    ctx.moveTo(offsetX + 30, 8);
    ctx.lineTo(offsetX + 50, 52);
    ctx.lineTo(offsetX + 30, 52);
    ctx.closePath();
    ctx.fillStyle = '#424242';
    ctx.fill();

    // Snow Peak
    ctx.beginPath();
    ctx.moveTo(offsetX + 30, 8);
    ctx.lineTo(offsetX + 24, 20);
    ctx.lineTo(offsetX + 30, 24);
    ctx.lineTo(offsetX + 36, 20);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // 3: Forest Obstacle Tile
  private drawForestTile(offsetX: number) {
    const ctx = this.atlasCtx;
    // Base grass
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(offsetX, 0, this.tileSize, this.tileSize);

    // Tree 1 (Large Pine)
    this.drawPineTree(ctx, offsetX + 30, 24, 22);

    // Tree 2 (Small Pine Left)
    this.drawPineTree(ctx, offsetX + 16, 42, 14);

    // Tree 3 (Small Pine Right)
    this.drawPineTree(ctx, offsetX + 44, 42, 14);
  }

  private drawPineTree(ctx: CanvasRenderingContext2D, centerX: number, bottomY: number, size: number) {
    // Trunk
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(centerX - 3, bottomY, 6, 8);

    // Foliage layers
    ctx.fillStyle = '#1b5e20';
    for (let i = 0; i < 3; i++) {
      const layerSize = size - i * 5;
      const layerY = bottomY - i * 8;
      ctx.beginPath();
      ctx.moveTo(centerX - layerSize / 2, layerY);
      ctx.lineTo(centerX, layerY - 14);
      ctx.lineTo(centerX + layerSize / 2, layerY);
      ctx.closePath();
      ctx.fill();
    }
  }

  public drawTile(ctx: CanvasRenderingContext2D, tileIndex: number, dx: number, dy: number) {
    ctx.drawImage(
      this.atlasCanvas,
      tileIndex * this.tileSize,
      0,
      this.tileSize,
      this.tileSize,
      dx,
      dy,
      this.tileSize,
      this.tileSize
    );
  }
}
