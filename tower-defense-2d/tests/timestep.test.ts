import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { EnemyManager2D } from '../src/engine/EnemyManager';
import { FIXED_STEP_MS, FixedTimestep } from '../src/engine/FixedTimestep';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { WaveManager } from '../src/engine/WaveManager';

describe('FixedTimestep accumulator', () => {
  it('converts one 60 fps frame into exactly one simulation step', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(FIXED_STEP_MS, 1, () => {})).toBe(1);
  });

  it('is frame-rate independent: the same wall time yields the same step count', () => {
    const totalMs = 2000;

    const run = (frameDeltaMs: number) => {
      const ts = new FixedTimestep();
      let steps = 0;
      const frames = Math.round(totalMs / frameDeltaMs);
      for (let f = 0; f < frames; f++) {
        steps += ts.advance(frameDeltaMs, 1, () => {});
      }
      return steps;
    };

    const at60 = run(1000 / 60);
    const at144 = run(1000 / 144);
    const at30 = run(1000 / 30);

    // 2000 ms of simulated time is 120 steps of 1/60 s, give or take one rounding step.
    expect(at60).toBeGreaterThanOrEqual(119);
    expect(Math.abs(at144 - at60)).toBeLessThanOrEqual(1);
    expect(Math.abs(at30 - at60)).toBeLessThanOrEqual(1);
  });

  it('multiplies simulated time by the speed multiplier', () => {
    const run = (speed: number) => {
      const ts = new FixedTimestep();
      let steps = 0;
      for (let f = 0; f < 60; f++) {
        steps += ts.advance(FIXED_STEP_MS, speed, () => {});
      }
      return steps;
    };

    // 60 frames of 1/60 s: 1x -> ~60 steps, 2x -> ~120, 4x -> ~240 (±1 step of
    // floating-point rounding in the accumulator).
    expect(run(1)).toBeCloseTo(60, -0.5);
    expect(run(2)).toBeGreaterThanOrEqual(119);
    expect(run(2)).toBeLessThanOrEqual(120);
    expect(run(4)).toBeGreaterThanOrEqual(239);
    expect(run(4)).toBeLessThanOrEqual(240);
  });

  it('clamps huge deltas so a backgrounded tab cannot flush the simulation', () => {
    const ts = new FixedTimestep();
    let steps = 0;

    // 30 seconds in a single frame (tab restored from background).
    steps += ts.advance(30_000, 1, () => {});

    // The 100 ms clamp caps this at ~6 steps instead of the ~1800 the raw delta implied.
    expect(steps).toBeGreaterThanOrEqual(5);
    expect(steps).toBeLessThanOrEqual(6);
    expect(steps).toBeLessThanOrEqual(ts.maxStepsPerFrame);
  });

  it('caps the number of steps per frame and drops the backlog', () => {
    const ts = new FixedTimestep(FIXED_STEP_MS, 100, 4);
    const steps = ts.advance(100, 4, () => {});

    expect(steps).toBe(4);
    expect(ts.pendingMs).toBe(0);
  });

  it('ignores negative deltas', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(-500, 1, () => {})).toBe(0);
  });
});

interface Snapshot {
  enemyCount: number;
  positions: string[];
  baseHp: number;
  gold: number;
}

function buildHarness() {
  const mapManager = new MapManager2D('MAP_1');
  const gameState = new GameState();
  const waveManager = new WaveManager();
  const audioManager = new AudioManager();
  const enemyManager = new EnemyManager2D(mapManager, gameState, waveManager, audioManager);

  waveManager.startNextWave();

  return { gameState, waveManager, enemyManager };
}

function snapshot(h: ReturnType<typeof buildHarness>): Snapshot {
  return {
    enemyCount: h.enemyManager.getEnemies().length,
    positions: h.enemyManager.getEnemies().map(
      e => `${e.data.position.x.toFixed(6)}:${e.data.position.y.toFixed(6)}:${e.data.waypointIndex}`
    ),
    baseHp: h.gameState.baseHp,
    gold: h.gameState.gold,
  };
}

/**
 * Drives the simulation through FixedTimestep with frames of `frameDeltaMs` and captures
 * the state at exactly `targetStep` simulation steps.
 */
function simulateUntilStep(frameDeltaMs: number, targetStep: number, speed = 1) {
  const h = buildHarness();
  const ts = new FixedTimestep();

  let step = 0;
  let captured: Snapshot | null = null;
  let frames = 0;

  while (captured === null && frames < 50_000) {
    frames++;
    ts.advance(frameDeltaMs, speed, (stepMs) => {
      if (captured !== null) return;
      h.enemyManager.update(stepMs);
      step++;
      if (step === targetStep) captured = snapshot(h);
    });
  }

  return { snapshot: captured, frames };
}

describe('Simulation determinism under fixed timestep', () => {
  const TARGET_STEPS = 300; // 5 simulated seconds

  it('produces identical state after N steps regardless of the frame delta', () => {
    const at60 = simulateUntilStep(1000 / 60, TARGET_STEPS);
    const at144 = simulateUntilStep(1000 / 144, TARGET_STEPS);
    const at30 = simulateUntilStep(1000 / 30, TARGET_STEPS);
    const jittery = simulateUntilStep(23.7, TARGET_STEPS);

    expect(at60.snapshot).not.toBeNull();
    expect(at60.snapshot!.enemyCount).toBeGreaterThan(0);

    // Same simulated state on a 60 Hz, 144 Hz, 30 Hz and irregular-frame device.
    expect(at144.snapshot).toEqual(at60.snapshot);
    expect(at30.snapshot).toEqual(at60.snapshot);
    expect(jittery.snapshot).toEqual(at60.snapshot);
  });

  it('reaches the same simulated state in fewer real frames at 4x speed', () => {
    const at1x = simulateUntilStep(1000 / 60, TARGET_STEPS, 1);
    const at4x = simulateUntilStep(1000 / 60, TARGET_STEPS, 4);

    // 2x/4x now really accelerate the simulation instead of only increasing density.
    expect(at4x.snapshot).toEqual(at1x.snapshot);
    expect(at4x.frames).toBeLessThan(at1x.frames / 3);
  });
});
