import { describe, expect, it } from 'vitest';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import { AudioManager } from '../src/engine/AudioManager';

describe('Tower Health, Damage & Repair Mechanics Tests', () => {
  it('should initialize tower with full health and absorb damage', () => {
    const tower = new Tower2D(2, 2, 60, 'BASIC', '1');
    expect(tower.data.hp).toBe(100);
    expect(tower.data.maxHp).toBe(100);
    expect(tower.data.isDestroyed).toBe(false);

    // Take 40 damage
    const destroyed = tower.takeDamage(40);
    expect(destroyed).toBe(false);
    expect(tower.data.hp).toBe(60);
    expect(tower.data.isDestroyed).toBe(false);
  });

  it('should mark tower as destroyed when HP reaches 0 and stop firing', () => {
    const tower = new Tower2D(2, 2, 60, 'BASIC', '1');
    const destroyed = tower.takeDamage(100);

    expect(destroyed).toBe(true);
    expect(tower.data.hp).toBe(0);
    expect(tower.data.isDestroyed).toBe(true);

    // Destroyed towers cannot fire
    const canUpdate = tower.update();
    expect(canUpdate).toBe(false);
  });

  it('should calculate repair cost 30% cheaper than new tower and restore HP', () => {
    const map = new MapManager2D('MAP_1');
    const pm = new ProjectileManager2D();
    const state = new GameState();
    state.gold = 100;
    const audio = new AudioManager();
    const tm = new TowerManager2D(map, pm, state, audio);

    // Basic tower cost = 50g. Full repair cost = 70% of 50 = 35g.
    const tower = new Tower2D(2, 2, 60, 'BASIC', '1');
    tower.takeDamage(100); // Destroyed
    tm['towers'].push(tower);
    tm.selectedTower = tower;

    const repairCost = tower.getRepairCost();
    expect(repairCost).toBe(35); // 30% cheaper than 50g

    const repaired = tm.repairSelectedTower();
    expect(repaired).toBe(true);
    expect(tower.data.hp).toBe(100);
    expect(tower.data.isDestroyed).toBe(false);
    expect(state.gold).toBe(65); // 100 - 35 = 65g
  });
});
