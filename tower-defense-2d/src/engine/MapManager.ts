import type { Vector2D } from '../types';
import { Rng } from './Rng';

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

  public currentMapId: MapId = 'MAP_1';
  private mapData: TileType[][] = [];

  constructor(mapId: MapId = 'MAP_1') {
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

  public render(_ctx: CanvasRenderingContext2D) {
    // Terreno agora é renderizado via WebGL no ThreeRenderer.
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
