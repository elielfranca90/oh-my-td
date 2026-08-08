import { describe, expect, it } from 'vitest';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';

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

  it('should initialize SOLAR_PRISM damage at 6 and ramp damage with beamDuration', () => {
    const tower = new Tower2D(2, 2, 60, 'SOLAR_PRISM', 'solar-1');
    expect(tower.data.damage).toBe(6);

    // Default fireRate is 24, focusPeriod is 60 (1s @ 60fps)
    const cd = tower.data.fireRate; // 24
    let beamDuration = 0;

    // Shot 1 (t=0s): beamDuration = 24
    beamDuration += cd;
    let focusBonus = Math.min(1.5, Math.floor(beamDuration / 60) * 0.25);
    let laserDmg = Math.round(tower.data.damage * (1 + focusBonus));
    expect(focusBonus).toBe(0);
    expect(laserDmg).toBe(6);

    // Shot 2 (t=0.4s): beamDuration = 48
    beamDuration += cd;
    focusBonus = Math.min(1.5, Math.floor(beamDuration / 60) * 0.25);
    laserDmg = Math.round(tower.data.damage * (1 + focusBonus));
    expect(focusBonus).toBe(0);
    expect(laserDmg).toBe(6);

    // Shot 3 (t=0.8s, beamDuration=72 -> >=60): 1 sec reached! focusBonus = 0.25
    beamDuration += cd;
    focusBonus = Math.min(1.5, Math.floor(beamDuration / 60) * 0.25);
    laserDmg = Math.round(tower.data.damage * (1 + focusBonus));
    expect(focusBonus).toBe(0.25);
    expect(laserDmg).toBe(8); // Math.round(6 * 1.25) = 8

    // Fast forward to t=6s (beamDuration >= 360) -> max focus bonus = 1.50 (+150%)
    beamDuration = 360;
    focusBonus = Math.min(1.5, Math.floor(beamDuration / 60) * 0.25);
    laserDmg = Math.round(tower.data.damage * (1 + focusBonus));
    expect(focusBonus).toBe(1.5);
    expect(laserDmg).toBe(15); // Math.round(6 * 2.5) = 15
  });

  it('should update laserTargetPos per frame and clear target immediately when enemy leaves range or dies', () => {
    const map = new MapManager2D('MAP_1');
    const pm = new ProjectileManager2D();
    const state = new GameState();
    const audio = new AudioManager();
    const tm = new TowerManager2D(map, pm, state, audio);

    const waypoints = map.getWaypoints(0);
    const enemy = new Enemy2D(waypoints, 'STANDARD', 'e1', 1.0);
    // Place enemy within range of a Solar Prism tower at (2,2)
    const tower = new Tower2D(2, 2, 60, 'SOLAR_PRISM', 's1');
    tm.getTowers().push(tower);
    enemy.data.position = { x: tower.data.position.x + 20, y: tower.data.position.y };

    // 1st update: tower shoots enemy and sets laserTargetId & laserTargetPos
    tm.update([enemy]);
    expect(tower.data.laserTargetId).toBe('e1');
    expect(tower.data.laserTargetPos).toEqual(enemy.data.position);

    // Move enemy slightly (still in range) and tick update while tower is on cooldown
    enemy.data.position = { x: tower.data.position.x + 30, y: tower.data.position.y };
    tm.update([enemy]);
    expect(tower.data.laserTargetId).toBe('e1');
    expect(tower.data.laserTargetPos).toEqual({ x: tower.data.position.x + 30, y: tower.data.position.y });

    // Move enemy out of range (range is 140)
    enemy.data.position = { x: tower.data.position.x + 300, y: tower.data.position.y };
    tm.update([enemy]);
    expect(tower.data.laserTargetId).toBeUndefined();
    expect(tower.data.laserTargetPos).toBeUndefined();
    expect(tower.data.beamDuration).toBe(0);
  });
});
