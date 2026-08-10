import type { MapId, TileType } from '../types';

export class SpriteManager {
  private static instance: SpriteManager;

  private map1Atlas: HTMLCanvasElement;
  private map2Atlas: HTMLCanvasElement;
  private map3Atlas: HTMLCanvasElement;
  private map4Atlas: HTMLCanvasElement;
  public readonly tileSize = 60;

  private images: Map<string, HTMLCanvasElement> = new Map();
  private loaded: Map<string, boolean> = new Map();

  constructor() {
    this.map1Atlas = this.createAtlasCanvas();
    this.map2Atlas = this.createAtlasCanvas();
    this.map3Atlas = this.createAtlasCanvas();
    this.map4Atlas = this.createAtlasCanvas();

    this.generateMap1Atlas();
    this.generateMap2Atlas();
    this.generateMap3Atlas();
    this.generateMap4Atlas();
    this.buildCanvasSprites();
  }

  public static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }
  public getAtlas(mapId: MapId): HTMLCanvasElement {
    if (mapId === 'MAP_2') return this.map2Atlas;
    if (mapId === 'MAP_3') return this.map3Atlas;
    if (mapId === 'MAP_4') return this.map4Atlas;
    return this.map1Atlas;
  }


  private buildCanvasSprites() {
    if (typeof document === 'undefined') return;

    const make = (w = 128, h = 128) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      return { c, g };
    };

    // ── ENEMIES ────────────────────────────────────────────────────
    // STANDARD – círculo vermelho + X branco
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2);
        g.fillStyle = '#e53935'; g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(36, 36); g.lineTo(92, 92); g.stroke();
        g.beginPath(); g.moveTo(92, 36); g.lineTo(36, 92); g.stroke();
      }
      this.images.set('STANDARD', c); this.loaded.set('STANDARD', true);
    }

    // RUNNER – círculo laranja + 3 traços de velocidade à esquerda
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2);
        g.fillStyle = '#ff9800'; g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5; g.lineCap = 'round';
        [[28, 44],[20, 64],[28, 84]].forEach(([x, y]) => {
          g.beginPath(); g.moveTo(x, y); g.lineTo(56, y); g.stroke();
        });
      }
      this.images.set('RUNNER', c); this.loaded.set('RUNNER', true);
    }

    // TANK – hexágono roxo + inner circle
    {
      const { c, g } = make();
      if (g) {
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          i === 0 ? g.moveTo(64 + 54 * Math.cos(a), 64 + 54 * Math.sin(a))
                  : g.lineTo(64 + 54 * Math.cos(a), 64 + 54 * Math.sin(a));
        }
        g.closePath(); g.fillStyle = '#8e24aa'; g.fill();
        g.strokeStyle = '#e1bee7'; g.lineWidth = 5; g.stroke();
        g.beginPath(); g.arc(64, 64, 22, 0, Math.PI * 2);
        g.fillStyle = '#4a148c'; g.fill();
      }
      this.images.set('TANK', c); this.loaded.set('TANK', true);
    }

    // SHIELDED – anel azul externo + círculo azul interno
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2);
        g.strokeStyle = '#29b6f6'; g.lineWidth = 8; g.stroke();
        g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2);
        g.fillStyle = '#0288d1'; g.fill();
        g.strokeStyle = '#b3e5fc'; g.lineWidth = 4; g.stroke();
      }
      this.images.set('SHIELDED', c); this.loaded.set('SHIELDED', true);
    }

    // BOSS – círculo vermelho escuro + coroa dourada + olhos
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2);
        g.fillStyle = '#b71c1c'; g.fill();
        g.strokeStyle = '#ffd700'; g.lineWidth = 6; g.stroke();
        // coroa
        g.fillStyle = '#ffd700';
        g.beginPath(); g.moveTo(30, 64); g.lineTo(30, 38); g.lineTo(46, 52);
        g.lineTo(64, 30); g.lineTo(82, 52); g.lineTo(98, 38); g.lineTo(98, 64); g.closePath(); g.fill();
        // olhos
        g.fillStyle = '#ff1744';
        g.beginPath(); g.arc(50, 74, 8, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(78, 74, 8, 0, Math.PI * 2); g.fill();
      }
      this.images.set('BOSS', c); this.loaded.set('BOSS', true);
    }

    // SPORE_SPRINTER – cap de cogumelo verde + caule
    {
      const { c, g } = make();
      if (g) {
        // caule
        g.fillStyle = '#c8e6c9';
        g.fillRect(54, 72, 20, 34);
        // cap semicírculo
        g.beginPath(); g.arc(64, 64, 46, Math.PI, 0); g.closePath();
        g.fillStyle = '#7cb342'; g.fill();
        g.strokeStyle = '#33691e'; g.lineWidth = 4; g.stroke();
        // pontos brancos
        [[50, 50],[72, 46],[62, 60]].forEach(([x, y]) => {
          g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2);
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
        });
      }
      this.images.set('SPORE_SPRINTER', c); this.loaded.set('SPORE_SPRINTER', true);
    }

    // MOSS_GIANT – blob verde escuro + pedras + olhos verdes
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2);
        g.fillStyle = '#33691e'; g.fill();
        g.strokeStyle = '#aed581'; g.lineWidth = 6; g.stroke();
        // pedras (círculos cinza sobrepostos)
        [[52, 52],[76, 48],[64, 72]].forEach(([x, y]) => {
          g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2);
          g.fillStyle = 'rgba(100,100,100,0.4)'; g.fill();
        });
        // olhos
        g.fillStyle = '#76ff03';
        g.beginPath(); g.arc(50, 60, 7, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(78, 60, 7, 0, Math.PI * 2); g.fill();
      }
      this.images.set('MOSS_GIANT', c); this.loaded.set('MOSS_GIANT', true);
    }

    // BLACK_MEGA_BOSS – reservado para MegaBossSpriteRenderer; não registrar aqui.

    // ── TOWERS ─────────────────────────────────────────────────────
    // BASIC – círculo azul + losango interno
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2);
        g.fillStyle = '#1565c0'; g.fill();
        g.strokeStyle = '#90caf9'; g.lineWidth = 5; g.stroke();
        g.beginPath(); g.moveTo(64, 34); g.lineTo(90, 64); g.lineTo(64, 94); g.lineTo(38, 64); g.closePath();
        g.fillStyle = '#42a5f5'; g.fill();
      }
      this.images.set('BASIC', c); this.loaded.set('BASIC', true);
    }

    // CANNON – círculo cinza + 2 canos retangulares
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2);
        g.fillStyle = '#424242'; g.fill();
        g.strokeStyle = '#ff7043'; g.lineWidth = 5; g.stroke();
        g.fillStyle = '#ff5722';
        g.fillRect(78, 40, 16, 26); // cano direito
        g.fillRect(34, 40, 16, 26); // cano esquerdo
      }
      this.images.set('CANNON', c); this.loaded.set('CANNON', true);
    }

    // FROST – círculo ciano + floco de neve (6 linhas)
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2);
        g.fillStyle = '#006064'; g.fill();
        g.strokeStyle = '#80deea'; g.lineWidth = 5; g.stroke();
        g.strokeStyle = '#e0f7fa'; g.lineWidth = 5; g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          g.beginPath();
          g.moveTo(64, 64);
          g.lineTo(64 + 34 * Math.cos(a), 64 + 34 * Math.sin(a));
          g.stroke();
        }
      }
      this.images.set('FROST', c); this.loaded.set('FROST', true);
    }

    // ARTILLERY – círculo roxo + cano mortar vertical
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2);
        g.fillStyle = '#4a148c'; g.fill();
        g.strokeStyle = '#ce93d8'; g.lineWidth = 5; g.stroke();
        g.fillStyle = '#9c27b0';
        g.fillRect(54, 28, 20, 36); // cano
        g.beginPath(); g.arc(64, 72, 18, 0, Math.PI * 2);
        g.fillStyle = '#6a1b9a'; g.fill();
      }
      this.images.set('ARTILLERY', c); this.loaded.set('ARTILLERY', true);
    }

    // SOLAR_PRISM – círculo dourado + triângulo prism + raios
    {
      const { c, g } = make();
      if (g) {
        g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2);
        g.fillStyle = '#e65100'; g.fill();
        g.strokeStyle = '#ffeb3b'; g.lineWidth = 5; g.stroke();
        // triângulo prism
        g.beginPath(); g.moveTo(64, 28); g.lineTo(94, 88); g.lineTo(34, 88); g.closePath();
        g.fillStyle = '#ffee58'; g.fill();
        // raio central
        g.strokeStyle = '#fff9c4'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(64, 16); g.lineTo(64, 28); g.stroke();
      }
      this.images.set('SOLAR_PRISM', c); this.loaded.set('SOLAR_PRISM', true);
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
  // --- MAP 4: GRAVE PASS (Dark Crypt & Spectral Emerald) ---
  private generateMap4Atlas() {
    const ctx = this.map4Atlas.getContext('2d');
    if (!ctx) return;

    // 0: Haunted Crypt Soil Tile
    ctx.fillStyle = '#181124';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);
    ctx.strokeStyle = '#2c1b4d';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, 52, 52);
    ctx.fillStyle = '#4a148c';
    ctx.fillRect(12, 12, 4, 4);
    ctx.fillRect(44, 40, 4, 4);

    // 1: Spectral Emerald Runic Trail
    const pOff = this.tileSize;
    ctx.fillStyle = '#211033';
    ctx.fillRect(pOff, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#00c853';
    ctx.fillRect(pOff + 16, 16, 28, 28);
    ctx.fillStyle = '#69f0ae';
    ctx.fillRect(pOff + 22, 22, 16, 16);

    // 2: Crypt Tombstone
    const mOff = 2 * this.tileSize;
    ctx.fillStyle = '#181124';
    ctx.fillRect(mOff, 0, this.tileSize, this.tileSize);
    ctx.fillStyle = '#311b92';
    ctx.beginPath();
    ctx.arc(mOff + 30, 24, 14, Math.PI, 0);
    ctx.rect(mOff + 16, 24, 28, 26);
    ctx.fill();
    ctx.strokeStyle = '#7c4dff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#00e676';
    ctx.fillRect(mOff + 28, 30, 4, 12);
    ctx.fillRect(mOff + 24, 34, 12, 4);

    // 3: Spectral Crypt Portal
    const cOff = 3 * this.tileSize;
    ctx.fillStyle = '#181124';
    ctx.fillRect(cOff, 0, this.tileSize, this.tileSize);
    ctx.beginPath();
    ctx.arc(cOff + 30, 30, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#00e676';
    ctx.fill();
    ctx.strokeStyle = '#b9f6ca';
    ctx.lineWidth = 2;
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
    if (mapId === 'MAP_4') atlas = this.map4Atlas;

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
