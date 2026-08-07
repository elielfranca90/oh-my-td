import { describe, expect, it } from 'vitest';
import { AnalyticsManager } from '../src/engine/AnalyticsManager';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';
import { FXManager } from '../src/engine/FXManager';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ParticleManager } from '../src/engine/ParticleManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import type { EnemyType, TowerType } from '../src/types';

const TILE = 60;

function buildManager() {
  const mapManager = new MapManager2D('MAP_1');
  const projectileManager = new ProjectileManager2D();
  const gameState = new GameState();
  gameState.gold = 10_000;
  const audioManager = new AudioManager();
  const particleManager = new ParticleManager();
  const analyticsManager = new AnalyticsManager();
  const fxManager = new FXManager();
  const towerManager = new TowerManager2D(
    mapManager, projectileManager, gameState, audioManager, particleManager, undefined, analyticsManager
  );

  return { towerManager, projectileManager, particleManager, fxManager, analyticsManager, gameState };
}

/** Places a tower of the given type on the buildable tile (0,1) of Map 1. */
function placeTower(h: ReturnType<typeof buildManager>, type: TowerType): Tower2D {
  h.towerManager.selectedBuildType = type;
  const placed = h.towerManager.placeTower(0, 1);
  expect(placed).toBe(true);
  return h.towerManager.selectedTower!;
}

/** An enemy parked right next to the tower at (0,1), i.e. inside every tower's range. */
function enemyNextToTower(type: EnemyType) {
  const waypoints = [
    { x: 0 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 },
    { x: 4 * TILE, y: 1 * TILE + TILE / 2 },
  ];
  return new Enemy2D(waypoints, type, 'target-1', 1.0, 0);
}

describe('TowerManager2D — Solar Prism focus', () => {
  it('counts focus in simulation steps, not in shots', () => {
    const h = buildManager();
    const tower = placeTower(h, 'SOLAR_PRISM');
    const enemy = enemyNextToTower('TANK');
    enemy.data.hp = 100_000;
    enemy.data.maxHp = 100_000;

    expect(tower.getEffectiveFireRate()).toBe(24);

    // ~1 s of continuous focus. The tower fires every 24 steps, so beamDuration tracks
    // the elapsed focus (48 steps at the 3rd shot). The old code incremented by 1 per
    // shot while dividing by 60, so this same run only reached 2.
    for (let step = 0; step < 61; step++) {
      h.towerManager.update([enemy], h.fxManager);
    }

    expect(tower.data.laserTargetId).toBe(enemy.data.id);
    expect(tower.data.beamDuration).toBeGreaterThanOrEqual(48);
  });

  it('grants +10% per second of focus and caps the bonus at +100%', () => {
    const h = buildManager();
    const tower = placeTower(h, 'SOLAR_PRISM');
    const enemy = enemyNextToTower('TANK');
    enemy.data.hp = 10_000_000;
    enemy.data.maxHp = 10_000_000;
    const baseDamage = tower.data.damage;

    const damagePerShot = (steps: number) => {
      const before = h.analyticsManager.damageByTower.SOLAR_PRISM;
      let shots = 0;
      for (let step = 0; step < steps; step++) {
        const hpBefore = enemy.data.hp;
        h.towerManager.update([enemy], h.fxManager);
        if (enemy.data.hp !== hpBefore) shots++;
      }
      const dealt = h.analyticsManager.damageByTower.SOLAR_PRISM - before;
      return shots > 0 ? dealt / shots : 0;
    };

    // First second: still at (or near) the base damage.
    const early = damagePerShot(60);
    // After ~10 s of uninterrupted focus the bonus is maxed out.
    damagePerShot(600);
    const late = damagePerShot(120);

    expect(early).toBeLessThan(late);
    expect(late).toBeCloseTo(baseDamage * 2, 0); // +100% cap
    expect(Math.floor((tower.data.beamDuration || 0) / 60) * 0.1).toBeGreaterThanOrEqual(1);
  });

  it('resets focus when the target changes', () => {
    const h = buildManager();
    const tower = placeTower(h, 'SOLAR_PRISM');

    const first = enemyNextToTower('TANK');
    first.data.hp = 100_000;
    first.data.maxHp = 100_000;
    for (let step = 0; step < 100; step++) h.towerManager.update([first], h.fxManager);
    expect(tower.data.beamDuration).toBeGreaterThan(0);

    const second = enemyNextToTower('TANK');
    second.data.id = 'target-2';
    second.data.hp = 100_000;
    second.data.maxHp = 100_000;
    tower.data.cooldownTimer = 0;
    h.towerManager.update([second], h.fxManager);

    expect(tower.data.laserTargetId).toBe('target-2');
    expect(tower.data.beamDuration).toBe(0);
  });

  it('records Solar Prism damage in analytics (FXManager is now always wired)', () => {
    const h = buildManager();
    placeTower(h, 'SOLAR_PRISM');
    const enemy = enemyNextToTower('TANK');
    enemy.data.hp = 100_000;
    enemy.data.maxHp = 100_000;

    h.towerManager.update([enemy], h.fxManager);

    expect(h.analyticsManager.damageByTower.SOLAR_PRISM).toBeGreaterThan(0);
  });

  it('draws the beam towards the real target position', () => {
    const h = buildManager();
    const tower = placeTower(h, 'SOLAR_PRISM');
    const enemy = enemyNextToTower('TANK');
    enemy.data.hp = 100_000;
    enemy.data.maxHp = 100_000;
    h.towerManager.update([enemy], h.fxManager);

    const lines: Array<{ x: number; y: number }> = [];
    const ctxStub = {
      canvas: { width: 840, height: 600 },
      save() {}, restore() {}, beginPath() {},
      moveTo() {},
      lineTo(x: number, y: number) { lines.push({ x, y }); },
      stroke() {}, fill() {}, arc() {}, fillRect() {}, strokeRect() {},
      set strokeStyle(_v: string) {}, set fillStyle(_v: string) {}, set lineWidth(_v: number) {},
    } as unknown as CanvasRenderingContext2D;

    h.towerManager.render(ctxStub, null, [enemy]);

    // The beam used to be a fixed 40 px vertical stub above the tower.
    expect(lines.length).toBeGreaterThan(0);
    const beam = lines[0];
    expect(Math.abs(beam.x - enemy.data.position.x)).toBeLessThanOrEqual(3);
    expect(Math.abs(beam.y - enemy.data.position.y)).toBeLessThanOrEqual(3);
    expect(beam.y).not.toBe(tower.data.position.y - 40);
  });
});

describe('TowerManager2D — Artillery napalm placement', () => {
  it('spawns the fire patch at the impact point, not at the muzzle', () => {
    const h = buildManager();
    placeTower(h, 'ARTILLERY');

    // Target far away so the shell needs many steps to arrive.
    const waypoints = [
      { x: 30, y: 90 },
      { x: 700, y: 90 },
    ];
    const enemy = new Enemy2D(waypoints, 'TANK', 'far-target', 1.0, 0);
    enemy.data.hp = 100_000;
    enemy.data.maxHp = 100_000;
    enemy.data.position = { x: 160, y: 90 };
    enemy.data.speed = 0; // stationary, so impact position == enemy position

    h.towerManager.update([enemy], h.fxManager);

    const patchesAfterFiring = h.particleManager.getFirePatches().length;
    // The napalm used to be created at fire time, next to the tower.
    expect(patchesAfterFiring).toBe(0);

    // Advance the projectile until it lands.
    for (let step = 0; step < 200 && h.particleManager.getFirePatches().length === 0; step++) {
      h.projectileManager.update([enemy], h.fxManager, h.analyticsManager);
    }

    const patches = h.particleManager.getFirePatches();
    expect(patches.length).toBe(1);
    expect(Math.abs(patches[0].x - enemy.data.position.x)).toBeLessThan(10);
    expect(Math.abs(patches[0].y - enemy.data.position.y)).toBeLessThan(10);
  });
});

describe('TowerManager2D — cooldown unification', () => {
  it('uses a single fire-rate formula for every tower type', () => {
    const h = buildManager();

    for (const type of ['BASIC', 'CANNON', 'FROST', 'ARTILLERY', 'SOLAR_PRISM'] as TowerType[]) {
      const tower = new Tower2D(0, 1, TILE, type, `t-${type}`);
      expect(tower.getEffectiveFireRate()).toBe(tower.data.fireRate);
      tower.resetCooldown();
      expect(tower.data.cooldownTimer).toBe(tower.data.fireRate);
    }

    // Frost used to set the cooldown by hand and Solar Prism used a hardcoded 24.
    const frost = placeTower(h, 'FROST');
    const enemy = enemyNextToTower('TANK');
    enemy.data.hp = 100_000;
    enemy.data.maxHp = 100_000;
    h.towerManager.update([enemy], h.fxManager);
    expect(frost.data.cooldownTimer).toBe(frost.data.fireRate);
  });
});

describe('Tower2D sell value rounding', () => {
  it('does not lose gold to floating-point error', () => {
    const tower = new Tower2D(0, 1, TILE, 'BASIC', 't1');
    tower.upgrade();
    tower.upgrade();

    // Invested 50 + 40 + 80 = 170. 170 * 0.7 is 118.99999999999999 in binary floats, so
    // Math.floor used to return 118 instead of 119.
    expect(tower.getSellValue()).toBe(119);
  });

  it('still refunds 70% for a level 1 tower', () => {
    const tower = new Tower2D(0, 1, TILE, 'BASIC', 't1');
    expect(tower.getSellValue()).toBe(35);
  });
});
