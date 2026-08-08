import { describe, expect, it } from 'vitest';
import { MapManager2D } from '../src/engine/MapManager';
import { Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { GameState } from '../src/engine/GameState';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';

describe('Biome Hazards & Dynamic Environmental Mechanics Tests', () => {
  it('should initialize correct hazard state per map', () => {
    const map1 = new MapManager2D('MAP_1');
    expect(map1.hazardState.type).toBe('MIST');

    const map2 = new MapManager2D('MAP_2');
    expect(map2.hazardState.type).toBe('LAVA_GEYSER');
    expect(map2.hazardState.geysers.length).toBeGreaterThan(0);

    const map3 = new MapManager2D('MAP_3');
    expect(map3.hazardState.type).toBe('POWER_SURGE');
    expect(map3.hazardState.powerSurgeTiles.length).toBeGreaterThan(0);
  });

  it('should update hazard state timers and toggle Lava Geyser eruption', () => {
    const map2 = new MapManager2D('MAP_2');
    const geyser = map2.hazardState.geysers[0];
    const initialTimer = geyser.timer;

    map2.updateHazards(initialTimer + 1);
    expect(geyser.isActive).toBe(true);
    expect(geyser.timer).toBe(240);
  });

  it('should apply Power Surge buff to towers built on power surge tiles in MAP_3', () => {
    const map3 = new MapManager2D('MAP_3');
    const projManager = new ProjectileManager2D();
    const gameState = new GameState();
    const audioManager = new AudioManager();
    const towerManager = new TowerManager2D(map3, projManager, gameState, audioManager);

    gameState.gold = 500;
    const surgeTile = map3.hazardState.powerSurgeTiles[0];

    const placed = towerManager.placeTower(surgeTile.gridX, surgeTile.gridY);
    expect(placed).toBe(true);

    const tower = towerManager.getTowerAt(surgeTile.gridX, surgeTile.gridY);
    expect(tower).toBeDefined();
    expect(tower?.data.isPowerSurged).toBe(true);
  });

  it('should overheat towers adjacent to erupting lava geysers', () => {
    const map2 = new MapManager2D('MAP_2');
    const geyser = map2.hazardState.geysers[0];
    geyser.isActive = true;

    expect(map2.isAdjacentToEruptingGeyser(geyser.gridX + 1, geyser.gridY)).toBe(true);
    expect(map2.isAdjacentToEruptingGeyser(0, 0)).toBe(false);

    const tower = new Tower2D(geyser.gridX + 1, geyser.gridY, map2.tileSize, 'BASIC', 't-1');
    tower.data.overheatTimer = 180;

    const ready = tower.update();
    expect(ready).toBe(false);
    expect(tower.data.overheatTimer).toBe(179);
  });
});
