import { beforeEach, describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { Game2D } from '../src/engine/Game';
import { MapManager2D } from '../src/engine/MapManager';
import { SpriteManager } from '../src/engine/SpriteManager';

describe('Map 4: Grave Pass (Cemitério Obscuro) Integration Tests', () => {
  beforeEach(() => {
    const fakeCtx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === 'canvas') return document.createElement('canvas');
          if (prop === 'measureText') return () => ({ width: 10 });
          if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
            return () => ({ addColorStop: () => {} });
          }
          if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
          return () => {};
        },
        set: () => true,
      }
    );
    (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext = () => fakeCtx;

    document.body.innerHTML = `
      <div id="game-area"></div>
      <div id="ui-container"></div>
    `;
  });

  it('should initialize MapManager2D with MAP_4 data, waypoints, and GRAVEYARD_SOULS hazard', () => {
    const mapManager = new MapManager2D('MAP_4');

    expect(mapManager.currentMapId).toBe('MAP_4');
    expect(mapManager.cols).toBe(14);
    expect(mapManager.rows).toBe(10);

    const mapData = mapManager.getMapData();
    expect(mapData.length).toBe(10);
    expect(mapData[0].length).toBe(14);

    expect(mapManager.hazardState.type).toBe('GRAVEYARD_SOULS');
    expect(mapManager.hazardState.geysers.length).toBe(2);
    expect(mapManager.hazardState.isMistActive).toBe(true);

    const waypoints = mapManager.getWaypoints();
    expect(waypoints.length).toBe(8);
    expect(waypoints[0]).toEqual({ x: 90, y: 30 }); // (1,0) center
    expect(waypoints[waypoints.length - 1]).toEqual({ x: 90, y: 570 }); // (1,9) center
  });

  it('should update GRAVEYARD_SOULS hazards and toggle soul geysers over time', () => {
    const mapManager = new MapManager2D('MAP_4');
    const geyser = mapManager.hazardState.geysers[0];

    expect(geyser.isActive).toBe(false);

    // Advance past geyser timer
    mapManager.updateHazards(400);

    expect(geyser.isActive).toBe(true);
  });

  it('should generate and retrieve map4Atlas in SpriteManager', () => {
    const spriteManager = SpriteManager.getInstance();
    const atlas = spriteManager.getAtlas('MAP_4');

    expect(atlas).toBeDefined();
    expect(atlas.width).toBeGreaterThan(0);
    expect(atlas.height).toBeGreaterThan(0);

    const canvas = document.createElement('canvas');
    canvas.width = 840;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Ensure drawTile executes without throwing
    expect(() => spriteManager.drawTile(ctx, 'MAP_4', 0, 0, 0)).not.toThrow();
    expect(() => spriteManager.drawTile(ctx, 'MAP_4', 1, 60, 0)).not.toThrow();
    expect(() => spriteManager.drawTile(ctx, 'MAP_4', 2, 120, 0)).not.toThrow();
    expect(() => spriteManager.drawTile(ctx, 'MAP_4', 3, 180, 0)).not.toThrow();
  });

  it('should support MAP_4 BGM track in AudioManager', () => {
    const audioManager = new AudioManager();

    expect(audioManager.currentTrack).toBe('MAP_1');

    audioManager.setTrack('MAP_4');
    expect(audioManager.currentTrack).toBe('MAP_4');
  });

  it('should allow Game2D to change map to MAP_4 and update hazards', () => {
    const game = new Game2D();

    game.changeMap('MAP_4');

    expect(game.currentMapId).toBe('MAP_4');
    expect(game.mapManager.hazardState.type).toBe('GRAVEYARD_SOULS');

    // Simulate map hazards update
    expect(() => game.mapManager.updateHazards(16)).not.toThrow();
  });

  it('should generate darkAltarTiles for MAP_4 and grant damage bonus to towers built on them', () => {
    const game = new Game2D();
    game.changeMap('MAP_4');

    expect(game['towerManager'].darkAltarTiles.length).toBe(3);
    const altarTile = game['towerManager'].darkAltarTiles[0];

    // Construir torre no tile do Altar Obscuro
    game.gameState.gold = 500;
    game.towerManager.setSelectedBuildType('BASIC');
    const built = game.towerManager.placeTower(altarTile.x, altarTile.y);

    expect(built).toBe(true);
    const tower = game.towerManager.getTowerAt(altarTile.x, altarTile.y);
    expect(tower?.data.onDarkAltarTile).toBe(true);
    // Custo base 50, dano base 5 -> +25% = 6 (Math.round(5 * 1.25))
    expect(tower?.data.damage).toBe(6);
  });
});
