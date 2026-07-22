import { describe, expect, it } from 'vitest';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import { AudioManager } from '../src/engine/AudioManager';

describe('Tower2D & TowerManager2D Tests', () => {
  it('should initialize tower stats and handle upgrades correctly', () => {
    const tower = new Tower2D(2, 2, 60, 'BASIC', '1');
    expect(tower.data.level).toBe(1);
    expect(tower.data.damage).toBe(5);

    const costLvl1 = tower.getUpgradeCost();
    expect(costLvl1).toBeGreaterThan(0);

    const upgraded = tower.upgrade();
    expect(upgraded).toBe(true);
    expect(tower.data.level).toBe(2);
    expect(tower.data.damage).toBe(7); // Math.floor(5 * 1.5) = 7
  });

  it('should cycle targeting strategies correctly', () => {
    const tower = new Tower2D(2, 2, 60, 'BASIC', '1');
    expect(tower.data.targeting).toBe('FIRST');

    tower.cycleTargeting();
    expect(tower.data.targeting).toBe('STRONGEST');

    tower.cycleTargeting();
    expect(tower.data.targeting).toBe('WEAKEST');

    tower.cycleTargeting();
    expect(tower.data.targeting).toBe('LAST');

    tower.cycleTargeting();
    expect(tower.data.targeting).toBe('FIRST');
  });

  it('should place tower, deduct gold, and calculate sell refund', () => {
    const map = new MapManager2D('MAP_1');
    const pm = new ProjectileManager2D();
    const state = new GameState();
    state.gold = 100;
    const audio = new AudioManager();

    const tm = new TowerManager2D(map, pm, state, audio);
    // (0,1) is buildable grass on Map 1
    const placed = tm.placeTower(0, 1);
    expect(placed).toBe(true);
    expect(state.gold).toBe(50); // 100 - 50 = 50g

    expect(tm.selectedTower).toBeDefined();
    const sellValue = tm.selectedTower!.getSellValue();
    expect(sellValue).toBe(35); // 70% of 50 = 35g

    const sold = tm.sellSelectedTower();
    expect(sold).toBe(true);
    expect(state.gold).toBe(85); // 50 + 35 = 85g
  });
});
