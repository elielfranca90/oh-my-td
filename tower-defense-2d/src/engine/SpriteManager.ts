import type { MapId, TileType } from './MapManager';

export class SpriteManager {
  private static instance: SpriteManager;

  private map1Atlas: HTMLCanvasElement;
  private map2Atlas: HTMLCanvasElement;
  private map3Atlas: HTMLCanvasElement;
  public readonly tileSize = 60;

  private images: Map<string, HTMLImageElement> = new Map();
  private loaded: Map<string, boolean> = new Map();

  constructor() {
    this.map1Atlas = this.createAtlasCanvas();
    this.map2Atlas = this.createAtlasCanvas();
    this.map3Atlas = this.createAtlasCanvas();

    this.generateMap1Atlas();
    this.generateMap2Atlas();
    this.generateMap3Atlas();
    this.loadGeneratedAssets();
  }

  public static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }

  private loadGeneratedAssets() {
    if (typeof window === 'undefined') return;
    const assets = [
      // Enemies
      { key: 'STANDARD', src: '/assets/standard_enemy.svg' },
      { key: 'RUNNER', src: '/assets/runner_sprite.svg' },
      { key: 'TANK', src: '/assets/tank_sprite.svg' },
      { key: 'SHIELDED', src: '/assets/shielded_enemy.svg' },
      { key: 'BOSS', src: '/assets/boss_enemy.svg' },
      { key: 'SPORE_SPRINTER', src: '/assets/spore_sprinter.svg' },
      { key: 'MOSS_GIANT', src: '/assets/moss_giant.svg' },
      { key: 'BLACK_MEGA_BOSS', src: '/assets/mega_boss_avatar.svg' },
      // Towers
      { key: 'BASIC', src: '/assets/basic_tower_icon.svg' },
      { key: 'CANNON', src: '/assets/cannon_tower_icon.svg' },
      { key: 'FROST', src: '/assets/frost_tower_icon.svg' },
      { key: 'ARTILLERY', src: '/assets/artillery_tower_icon.svg' },
      { key: 'SOLAR_PRISM', src: '/assets/solar_prism_icon.svg' },
    ];

    for (const a of assets) {
      const img = new Image();
      img.src = a.src;
      img.onload = () => {
        this.loaded.set(a.key, true);
      };
      this.images.set(a.key, img);
    }
  }

  public drawSpriteAsset(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    size: number
  ): boolean {
    if (this.loaded.get(key) && this.images.has(key)) {
      const img = this.images.get(key)!;
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      return true;
    }
    return false;
  }
  private createAtlasCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize * 4; // 4 tile types (0=Buildable, 1=Path, 2=Mountain, 3=Forest/Crystal)
    canvas.height = this.tileSize;
    return canvas;
  }

  // --- MAP 1: GREEN VALLEY (Bucolic Emerald Grass & Pine Forest) ---
  private generateMap1Atlas() {
    const ctx = this.map1Atlas.getContext('2d');
    if (!ctx) return;

    // 0: Grass Tile
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#388e3c';
    const blades = [{ x: 10, y: 15 }, { x: 25, y: 40 }, { x: 45, y: 10 }, { x: 50, y: 48 }];
    for (const b of blades) {
      ctx.fillRect(b.x, b.y, 4, 6);
    }

    // 1: Path Tile (Gravel)
    ctx.fillStyle = '#424242';
    ctx.fillRect(this.tileSize, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#616161';
    const gravel = [{ x: 8, y: 12 }, { x: 32, y: 8 }, { x: 20, y: 35 }, { x: 48, y: 28 }];
    for (const g of gravel) {
      ctx.beginPath();
      ctx.arc(this.tileSize + g.x, g.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2: Mountain Peak
    const mOff = 2 * this.tileSize;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(mOff, 0, this.tileSize, this.tileSize);
    ctx.beginPath();
    ctx.moveTo(mOff + 10, 52);
    ctx.lineTo(mOff + 30, 8);
    ctx.lineTo(mOff + 50, 52);
    ctx.closePath();
    ctx.fillStyle = '#616161';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mOff + 30, 8);
    ctx.lineTo(mOff + 24, 20);
    ctx.lineTo(mOff + 30, 24);
    ctx.lineTo(mOff + 36, 20);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 3: Pine Forest
    const fOff = 3 * this.tileSize;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(fOff, 0, this.tileSize, this.tileSize);
    this.drawPineTree(ctx, fOff + 30, 24, 22);
    this.drawPineTree(ctx, fOff + 16, 42, 14);
    this.drawPineTree(ctx, fOff + 44, 42, 14);
  }

  // --- MAP 2: DEATH PASS (Volcanic Basalt & Magma Lava) ---
  private generateMap2Atlas() {
    const ctx = this.map2Atlas.getContext('2d');
    if (!ctx) return;

    // 0: Basalt Ground Tile
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#292524';
    const cracks = [{ x: 12, y: 18 }, { x: 40, y: 44 }, { x: 50, y: 15 }];
    for (const c of cracks) {
      ctx.fillRect(c.x, c.y, 6, 6);
    }

    // 1: Magma Lava River Path
    const pOff = this.tileSize;
    ctx.fillStyle = '#3c3c3c';
    ctx.fillRect(pOff, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(pOff + 10, 10, 40, 40);
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(pOff + 18, 18, 24, 24);
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(pOff + 24, 24, 12, 12);

    // 2: Volcanic Magma Peak
    const mOff = 2 * this.tileSize;
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(mOff, 0, this.tileSize, this.tileSize);
    ctx.beginPath();
    ctx.moveTo(mOff + 8, 52);
    ctx.lineTo(mOff + 30, 6);
    ctx.lineTo(mOff + 52, 52);
    ctx.closePath();
    ctx.fillStyle = '#262626';
    ctx.fill();
    ctx.strokeStyle = '#ff3d00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lava crater at peak
    ctx.beginPath();
    ctx.arc(mOff + 30, 16, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3d00';
    ctx.fill();

    // 3: Dark Crystal Spire
    const cOff = 3 * this.tileSize;
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(cOff, 0, this.tileSize, this.tileSize);
    ctx.beginPath();
    ctx.moveTo(cOff + 30, 10);
    ctx.lineTo(cOff + 15, 48);
    ctx.lineTo(cOff + 45, 48);
    ctx.closePath();
    ctx.fillStyle = '#7b1fa2';
    ctx.fill();
    ctx.strokeStyle = '#e1bee7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- MAP 3: CITADEL (Arcano-Punk Gothic Obsidian & Neon Blue) ---
  private generateMap3Atlas() {
    const ctx = this.map3Atlas.getContext('2d');
    if (!ctx) return;

    // 0: Gothic Obsidian Floor Tile
    ctx.fillStyle = '#0f0529';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);
    ctx.strokeStyle = '#1a237e';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, 52, 52);

    // 1: Neon Blue Runic Circuit Trail
    const pOff = this.tileSize;
    ctx.fillStyle = '#12005e';
    ctx.fillRect(pOff, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#00b0ff';
    ctx.fillRect(pOff + 15, 15, 30, 30);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(pOff + 22, 22, 16, 16);

    // 2: Runic Obelisk
    const mOff = 2 * this.tileSize;
    ctx.fillStyle = '#0f0529';
    ctx.fillRect(mOff, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#311b92';
    ctx.fillRect(mOff + 18, 10, 24, 42);
    ctx.strokeStyle = '#7c4dff';
    ctx.lineWidth = 2;
    ctx.strokeRect(mOff + 18, 10, 24, 42);
    ctx.fillStyle = '#651fff';
    ctx.fillRect(mOff + 24, 18, 12, 12);

    // 3: Arcane Floating Crystal
    const cOff = 3 * this.tileSize;
    ctx.fillStyle = '#0f0529';
    ctx.fillRect(cOff, 0, this.tileSize, this.tileSize);
    ctx.beginPath();
    ctx.moveTo(cOff + 30, 8);
    ctx.lineTo(cOff + 18, 30);
    ctx.lineTo(cOff + 30, 52);
    ctx.lineTo(cOff + 42, 30);
    ctx.closePath();
    ctx.fillStyle = '#d500f9';
    ctx.fill();
    ctx.strokeStyle = '#ea80fc';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawPineTree(ctx: CanvasRenderingContext2D, centerX: number, bottomY: number, size: number) {
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(centerX - 3, bottomY, 6, 8);

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

  public drawTile(ctx: CanvasRenderingContext2D, mapId: MapId, tileType: TileType, dx: number, dy: number) {
    let atlas = this.map1Atlas;
    if (mapId === 'MAP_2') atlas = this.map2Atlas;
    if (mapId === 'MAP_3') atlas = this.map3Atlas;

    const atlasCtx = atlas.getContext('2d');
    if (!atlasCtx) return;

    ctx.drawImage(
      atlas,
      tileType * this.tileSize,
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
