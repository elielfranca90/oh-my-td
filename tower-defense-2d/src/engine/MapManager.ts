import { TileType, type BiomeHazardState, type MapId, type Vector2D } from '../types';
import { Rng } from './Rng';
import { SpriteManager } from './SpriteManager';
export { TileType, type MapId };

export class MapManager2D {
  public readonly cols = 14;
  public readonly rows = 10;
  public readonly tileSize = 60; // 840x600 canvas resolution

  public currentMapId: MapId = 'MAP_1';
  private mapData: TileType[][] = [];
  public hazardState!: BiomeHazardState;
  private spriteManager: SpriteManager = new SpriteManager();
  private staticLayer: HTMLCanvasElement | null = null;
  constructor(mapId: MapId = 'MAP_1') {
    this.setMap(mapId);
  }
  public setMap(mapId: MapId) {
    this.currentMapId = mapId;
    switch (mapId) {
      case 'MAP_2':
        this.mapData = this.getMap2Data();
        this.hazardState = {
          type: 'LAVA_GEYSER',
          geysers: [
            { gridX: 6, gridY: 3, isActive: false, timer: 480 },
            { gridX: 3, gridY: 7, isActive: false, timer: 720 },
            { gridX: 9, gridY: 7, isActive: false, timer: 960 },
          ],
          powerSurgeTiles: [],
          isMistActive: false,
          mistTimer: 0,
        };
        break;
      case 'MAP_3':
        this.mapData = this.getMap3Data();
        this.hazardState = {
          type: 'POWER_SURGE',
          geysers: [],
          powerSurgeTiles: [
            { gridX: 3, gridY: 1 },
            { gridX: 10, gridY: 1 },
            { gridX: 3, gridY: 8 },
            { gridX: 10, gridY: 8 },
          ],
          isMistActive: false,
          mistTimer: 0,
        };
        break;
      case 'MAP_4':
        this.mapData = this.getMap4Data();
        this.hazardState = {
          type: 'GRAVEYARD_SOULS',
          geysers: [
            { gridX: 4, gridY: 2, isActive: false, timer: 360 },
            { gridX: 9, gridY: 7, isActive: false, timer: 600 },
          ],
          powerSurgeTiles: [],
          isMistActive: true,
          mistTimer: 900,
        };
        break;
      case 'MAP_1':
      default:
        this.mapData = this.getMap1Data();
        this.hazardState = {
          type: 'MIST',
          geysers: [],
          powerSurgeTiles: [],
          isMistActive: false,
          mistTimer: 720,
        };
        break;
    }
    this.prerenderStaticLayer();
  }
  public getMapData(): TileType[][] {
    return this.mapData;
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
      [2, 1, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 1, 2],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 3, 3, 0, 0, 0, 3, 3, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 3, 0, 0, 0, 1, 0, 0, 0, 3, 3, 0, 0],
      [0, 3, 3, 0, 0, 0, 1, 0, 0, 0, 3, 3, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [2, 2, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 2, 2],
      [2, 2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2],
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
  // --- MAP 4: GRAVE PASS (Cemitério Obscuro) ---
  private getMap4Data(): TileType[][] {
    return [
      [2, 1, 0, 0, 3, 3, 2, 2, 3, 3, 0, 0, 2, 2],
      [0, 1, 0, 0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ];
  }


  public updateHazards(deltaTime = 1) {
    if (this.hazardState.type === 'LAVA_GEYSER') {
      for (const geyser of this.hazardState.geysers) {
        geyser.timer -= deltaTime;
        if (geyser.timer <= 0) {
          geyser.isActive = !geyser.isActive;
          geyser.timer = geyser.isActive ? 240 : 600;
        }
      }
    } else if (this.hazardState.type === 'MIST') {
      this.hazardState.mistTimer -= deltaTime;
      if (this.hazardState.mistTimer <= 0) {
        this.hazardState.isMistActive = !this.hazardState.isMistActive;
        this.hazardState.mistTimer = this.hazardState.isMistActive ? 720 : 1080;
      }
    } else if (this.hazardState.type === 'GRAVEYARD_SOULS') {
      for (const geyser of this.hazardState.geysers) {
        geyser.timer -= deltaTime;
        if (geyser.timer <= 0) {
          geyser.isActive = !geyser.isActive;
          geyser.timer = geyser.isActive ? 300 : 540;
        }
      }
      this.hazardState.mistTimer -= deltaTime;
      if (this.hazardState.mistTimer <= 0) {
        this.hazardState.isMistActive = !this.hazardState.isMistActive;
        this.hazardState.mistTimer = 800;
      }
    }
  }

  public isPowerSurgeTile(gridX: number, gridY: number): boolean {
    return this.hazardState.powerSurgeTiles.some(t => t.gridX === gridX && t.gridY === gridY);
  }

  public isGeyserEruptingAt(gridX: number, gridY: number): boolean {
    return this.hazardState.geysers.some(g => g.gridX === gridX && g.gridY === gridY && g.isActive);
  }

  public isAdjacentToEruptingGeyser(gridX: number, gridY: number): boolean {
    for (const geyser of this.hazardState.geysers) {
      if (!geyser.isActive) continue;
      const dx = Math.abs(geyser.gridX - gridX);
      const dy = Math.abs(geyser.gridY - gridY);
      if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
        return true;
      }
    }
    return false;
  }
  public renderHazards(ctx: CanvasRenderingContext2D) {
    if (!this.hazardState) return;

    ctx.save();
    // 1. Render Power Surge Tiles (Citadel Neon)
    if (this.hazardState.type === 'POWER_SURGE') {
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
      for (const tile of this.hazardState.powerSurgeTiles) {
        const x = tile.gridX * this.tileSize;
        const y = tile.gridY * this.tileSize;
        ctx.fillStyle = `rgba(0, 229, 255, ${0.15 + pulse * 0.15})`;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
        ctx.fillStyle = '#00e5ff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('⚡', x + this.tileSize - 4, y + 14);
      }
    }

    // 2. Render Lava Geysers (Death Pass Lava)
    if (this.hazardState.type === 'LAVA_GEYSER') {
      const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
      for (const g of this.hazardState.geysers) {
        const x = g.gridX * this.tileSize;
        const y = g.gridY * this.tileSize;
        if (g.isActive) {
          ctx.fillStyle = `rgba(255, 87, 34, ${0.35 + pulse * 0.25})`;
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          ctx.strokeStyle = '#ff3d00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, this.tileSize, this.tileSize);
          ctx.fillStyle = '#ff3d00';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🌋', x + this.tileSize / 2, y + this.tileSize / 2 + 5);
        } else {
          ctx.fillStyle = 'rgba(255, 111, 0, 0.1)';
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          ctx.strokeStyle = 'rgba(255, 111, 0, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
        }
      }
    }

    // 3. Render Mist Overlay (Green Valley)
    if (this.hazardState.type === 'MIST' && this.hazardState.isMistActive) {
      ctx.fillStyle = 'rgba(200, 225, 235, 0.18)';
      ctx.fillRect(0, 0, this.cols * this.tileSize, this.rows * this.tileSize);
    }

    ctx.restore();
  }

  private prerenderStaticLayer() {
    if (!this.staticLayer) {
      if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        const canvas = document.createElement('canvas');
        canvas.width = this.cols * this.tileSize;
        canvas.height = this.rows * this.tileSize;
        this.staticLayer = canvas;
      }
    }

    if (!this.staticLayer) return;

    const layerCtx = this.staticLayer.getContext('2d');
    if (!layerCtx) {
      this.staticLayer = null;
      return;
    }

    layerCtx.clearRect(0, 0, this.staticLayer.width, this.staticLayer.height);
    this.drawTiles(layerCtx);
  }

  private drawTiles(ctx: CanvasRenderingContext2D) {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const type = this.mapData[row][col];
        this.spriteManager.drawTile(ctx, this.currentMapId, type, col * this.tileSize, row * this.tileSize);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.staticLayer) {
      ctx.drawImage(this.staticLayer, 0, 0);
      return;
    }
    this.drawTiles(ctx);
  }

  public isBuildable(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return false;
    return this.mapData[gridY][gridX] === TileType.BUILDABLE;
  }

  /**
   * True se o tile na posição mundial informada, ou algum dos 8 vizinhos, for
   * floresta. Usado pela regeneração do MOSS_GIANT: inimigos sempre caminham
   * sobre PATH, então o que importa é estar *ao lado* de vegetação — trechos do
   * caminho colados na mata viram zona de perigo para quem tenta segurá-lo lá.
   */
  public isNearFoliage(worldX: number, worldY: number): boolean {
    const gridX = Math.floor(worldX / this.tileSize);
    const gridY = Math.floor(worldY / this.tileSize);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gridX + dx;
        const ny = gridY + dy;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        if (this.mapData[ny][nx] === TileType.OBSTACLE_FOREST) return true;
      }
    }
    return false;
  }

  /**
   * Sorteia tiles construíveis para o twist Overgrowth Sprout (+25% de alcance e
   * metade do cooldown para a torre erguida ali).
   *
   * Só entram tiles adjacentes ao caminho: um sprout longe da rota seria um
   * bônus decorativo que o jogador nunca teria motivo para usar.
   */
  public pickSproutTiles(count = 4, rng?: Rng): { x: number; y: number }[] {
    const random = rng || new Rng(Date.now());
    const candidates: { x: number; y: number }[] = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.mapData[y][x] !== TileType.BUILDABLE) continue;
        if (this.isAdjacentToPath(x, y)) candidates.push({ x, y });
      }
    }

    // Fisher-Yates parcial: embaralha só o necessário para tirar `count`.
    const picked: { x: number; y: number }[] = [];
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const j = i + random.int(candidates.length - i);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      picked.push(candidates[i]);
    }
    return picked;
  }

  /**
   * Sorteia tiles construíveis no Grave Pass (MAP_4) para o Altar Obscuro
   * (+25% de dano base e aura gótica de necrópole).
   */
  public pickDarkAltarTiles(count = 3, rng?: Rng): { x: number; y: number }[] {
    const random = rng || new Rng(Date.now());
    const candidates: { x: number; y: number }[] = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.mapData[y][x] !== TileType.BUILDABLE) continue;
        if (this.isAdjacentToPath(x, y)) candidates.push({ x, y });
      }
    }

    const picked: { x: number; y: number }[] = [];
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const j = i + random.int(candidates.length - i);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      picked.push(candidates[i]);
    }
    return picked;
  }

  private isAdjacentToPath(gridX: number, gridY: number): boolean {
    const neighbors = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of neighbors) {
      const nx = gridX + dx;
      const ny = gridY + dy;
      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
      if (this.mapData[ny][nx] === TileType.PATH) return true;
    }
    return false;
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
    if (this.currentMapId === 'MAP_4') {
      // Grave Pass Crypt Path
      return [
        { x: 1 * this.tileSize + half, y: 0 * this.tileSize + half },
        { x: 1 * this.tileSize + half, y: 2 * this.tileSize + half },
        { x: 7 * this.tileSize + half, y: 2 * this.tileSize + half },
        { x: 7 * this.tileSize + half, y: 4 * this.tileSize + half },
        { x: 12 * this.tileSize + half, y: 4 * this.tileSize + half },
        { x: 12 * this.tileSize + half, y: 7 * this.tileSize + half },
        { x: 1 * this.tileSize + half, y: 7 * this.tileSize + half },
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
