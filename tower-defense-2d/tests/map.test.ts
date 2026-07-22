import { describe, expect, it } from 'vitest';
import { MapManager2D, TileType } from '../src/engine/MapManager';

describe('MapManager2D Unit & Integration Tests', () => {
  it('should initialize with 14 columns and 10 rows', () => {
    const mapManager = new MapManager2D('MAP_1');
    expect(mapManager.cols).toBe(14);
    expect(mapManager.rows).toBe(10);
    expect(mapManager.tileSize).toBe(60);
  });

  it('should validate buildable tiles correctly and block obstacles & paths', () => {
    const mapManager = new MapManager2D('MAP_1');

    // (0,0) is Mountain Obstacle -> NOT buildable
    expect(mapManager.isBuildable(0, 0)).toBe(false);

    // (1,1) is Path -> NOT buildable
    expect(mapManager.isBuildable(1, 1)).toBe(false);

    // (2,2) is Forest Obstacle -> NOT buildable
    expect(mapManager.isBuildable(2, 2)).toBe(false);

    // (0,1) is Buildable Grass -> BUILDABLE
    expect(mapManager.isBuildable(0, 1)).toBe(true);

    // Out of bounds -> NOT buildable
    expect(mapManager.isBuildable(-1, 0)).toBe(false);
    expect(mapManager.isBuildable(15, 5)).toBe(false);
  });

  it('should generate valid waypoints for Map 1, Map 2 (Dual Spawn), and Map 3', () => {
    const map1 = new MapManager2D('MAP_1');
    const waypoints1 = map1.getWaypoints();
    expect(waypoints1.length).toBeGreaterThan(4);
    expect(waypoints1[0]).toEqual({ x: 90, y: 90 }); // (1,1) center

    const map2 = new MapManager2D('MAP_2');
    const pathA = map2.getWaypoints(0);
    const pathB = map2.getWaypoints(1);
    expect(pathA.length).toBeGreaterThan(0);
    expect(pathB.length).toBeGreaterThan(0);
    expect(pathA[0].x).not.toEqual(pathB[0].x); // Left vs Right portal spawns

    const map3 = new MapManager2D('MAP_3');
    const waypoints3 = map3.getWaypoints();
    expect(waypoints3.length).toBeGreaterThan(0);
  });
});
