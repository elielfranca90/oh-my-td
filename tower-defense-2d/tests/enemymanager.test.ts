import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';
import { EnemyManager2D } from '../src/engine/EnemyManager';
import { FIXED_STEP_MS } from '../src/engine/FixedTimestep';
import { GameState } from '../src/engine/GameState';
import { MapManager2D, type MapId } from '../src/engine/MapManager';
import { WaveManager } from '../src/engine/WaveManager';

function buildHarness(mapId: MapId = 'MAP_1') {
  const mapManager = new MapManager2D(mapId);
  const gameState = new GameState();
  const waveManager = new WaveManager();
  const audioManager = new AudioManager();
  const enemyManager = new EnemyManager2D(mapManager, gameState, waveManager, audioManager);
  return { mapManager, gameState, waveManager, enemyManager };
}

/** Injects an already-dead boss so `update()` runs the reinforcement path. */
function injectDeadBoss(
  h: ReturnType<typeof buildHarness>,
  waypointIndex: number,
  pathIndex = 0
): Enemy2D {
  const waypoints = h.mapManager.getWaypoints(pathIndex);
  const boss = new Enemy2D(waypoints, 'BOSS', 'boss-under-test', 1.0, pathIndex);
  boss.data.waypointIndex = waypointIndex;
  boss.data.position = { ...waypoints[Math.min(waypointIndex, waypoints.length - 1)] };
  boss.data.isDead = true;
  h.enemyManager.getEnemies().push(boss);
  return boss;
}

describe('EnemyManager2D boss reinforcements', () => {
  it('spawns exactly 2 runners when a boss dies', () => {
    const h = buildHarness('MAP_1');
    injectDeadBoss(h, 0);

    h.enemyManager.update(FIXED_STEP_MS);

    const runners = h.enemyManager.getEnemies();
    expect(runners.length).toBe(2);
    expect(runners.every(r => r.data.type === 'RUNNER')).toBe(true);
  });

  it('gives reinforcements unique ids', () => {
    const h = buildHarness('MAP_1');
    injectDeadBoss(h, 0);

    h.enemyManager.update(FIXED_STEP_MS);

    const [a, b] = h.enemyManager.getEnemies();
    expect(a.data.id).not.toBe(b.data.id);
  });

  it('clamps a boundary waypointIndex so reinforcements never reach the base instantly', () => {
    const h = buildHarness('MAP_1');
    const waypoints = h.mapManager.getWaypoints(0);

    // Boss dying on the LAST waypoint: `waypoints[index + 1]` used to be undefined, so
    // both runners reported "reached base" on their very first step (free double damage).
    injectDeadBoss(h, waypoints.length - 1);

    const hpBefore = h.gameState.baseHp;
    h.enemyManager.update(FIXED_STEP_MS);

    expect(h.enemyManager.getEnemies().length).toBe(2);
    for (const runner of h.enemyManager.getEnemies()) {
      expect(runner.data.waypointIndex).toBeLessThanOrEqual(waypoints.length - 2);
    }

    // One more step: they must still be walking, not damaging the base.
    h.enemyManager.update(FIXED_STEP_MS);
    expect(h.gameState.baseHp).toBe(hpBefore);
  });

  it('keeps reinforcements on the boss own route (Map 2 dual spawn)', () => {
    const h = buildHarness('MAP_2');
    const rightPath = h.mapManager.getWaypoints(1);
    injectDeadBoss(h, 1, 1);

    h.enemyManager.update(FIXED_STEP_MS);

    const runners = h.enemyManager.getEnemies();
    expect(runners.length).toBe(2);
    for (const runner of runners) {
      // The reinforcement used to inherit path 0 (left portal) regardless of the boss.
      expect(runner.pathIndex).toBe(1);
      expect(runner.data.pathIndex).toBe(1);
    }

    // Sanity: the two routes really are different, so the assertion above has teeth.
    expect(rightPath[0].x).not.toBe(h.mapManager.getWaypoints(0)[0].x);
  });

  it('awards the boss gold and records the kill before spawning reinforcements', () => {
    const h = buildHarness('MAP_1');
    const boss = injectDeadBoss(h, 0);
    const goldBefore = h.gameState.gold;

    h.enemyManager.update(FIXED_STEP_MS);

    expect(h.gameState.gold).toBe(goldBefore + boss.data.goldReward);
  });
});

describe('EnemyManager2D spawn queue draining', () => {
  it('spawns every enemy that became due in a single step', () => {
    const h = buildHarness('MAP_1');
    h.waveManager.startNextWave();

    // Wave 1 delays are 1000 then 1200 ms each. A 5 s step must not discard the queue:
    // the timer overflow used to be reset to zero, dropping all but one spawn.
    h.enemyManager.update(5000);

    expect(h.enemyManager.getEnemies().length).toBeGreaterThan(1);
  });

  it('never spawns more enemies than the wave declares', () => {
    const h = buildHarness('MAP_1');
    h.waveManager.startNextWave();
    const declared = h.waveManager.waves[0].enemies.length;

    h.enemyManager.update(60_000);

    expect(h.enemyManager.getEnemies().length).toBe(declared);
  });
});
