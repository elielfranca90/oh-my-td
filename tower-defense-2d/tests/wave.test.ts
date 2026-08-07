import { describe, expect, it } from 'vitest';
import { WaveManager } from '../src/engine/WaveManager';

/** Plays a wave to completion the way the engine does: drain the queue, then clear it. */
function playWaveToCompletion(wm: WaveManager) {
  wm.startNextWave();
  while (wm.getNextEnemyToSpawn(60_000) !== null) {
    // drain every queued spawn
  }
  wm.onEnemyCleared(0);
}

describe('WaveManager & Endless Scaling Tests', () => {
  it('should initialize 10 campaign waves', () => {
    const wm = new WaveManager();
    expect(wm.waves.length).toBe(10);
  });

  it('should start waves and handle enemy spawning', () => {
    const wm = new WaveManager();
    expect(wm.currentWaveIndex).toBe(-1);

    const started = wm.startNextWave();
    expect(started).toBe(true);
    expect(wm.currentWaveIndex).toBe(0);
    expect(wm.isWaveActive).toBe(true);

    // Get enemy spawn info
    const spawnInfo = wm.getNextEnemyToSpawn(1200);
    expect(spawnInfo).toBeDefined();
    expect(spawnInfo?.hpMultiplier).toBe(1.0);
  });

  it('should carry the spawn timer overflow instead of discarding it', () => {
    const wm = new WaveManager();
    wm.startNextWave();

    const firstDelay = wm.waves[0].enemies[0].delay;
    const secondDelay = wm.waves[0].enemies[1].delay;

    // One big step worth both delays must yield both enemies when drained with 0.
    expect(wm.getNextEnemyToSpawn(firstDelay + secondDelay)).not.toBeNull();
    expect(wm.getNextEnemyToSpawn(0)).not.toBeNull();
  });

  it('should expose a single boss-wave rule', () => {
    const wm = new WaveManager();

    expect(wm.isBossWave(5)).toBe(true);
    expect(wm.isBossWave(8)).toBe(true);
    expect(wm.isBossWave(10)).toBe(true);
    expect(wm.isBossWave(12)).toBe(true); // > 10 and divisible by 3
    expect(wm.isBossWave(1)).toBe(false);
    expect(wm.isBossWave(3)).toBe(false); // the %3 rule only applies above wave 10
    expect(wm.isBossWave(11)).toBe(false);
  });

  it('should include SHIELDED enemies in the campaign so the shield mechanic is reachable', () => {
    const wm = new WaveManager();
    const shieldedCount = wm.waves
      .flatMap(w => w.enemies)
      .filter(e => e.type === 'SHIELDED').length;

    expect(shieldedCount).toBeGreaterThan(0);
  });

  it('should still allow VICTORY after endless mode is turned on and back off', () => {
    const wm = new WaveManager();
    wm.setEndlessMode(true);

    // Play up to wave 12 in endless mode, which grows waves[] past the campaign length.
    for (let i = 0; i < 12; i++) {
      playWaveToCompletion(wm);
    }
    expect(wm.currentWaveIndex).toBe(11);
    expect(wm.waves.length).toBeGreaterThan(wm.campaignWaveCount);

    // Endless is on: victory must never fire.
    expect(wm.isLastWaveCompleted(0)).toBe(false);

    // Turning it off must make the campaign winnable again (it used to require exactly
    // index 9, so a wave-12 player could never win).
    wm.setEndlessMode(false);
    expect(wm.isLastWaveCompleted(0)).toBe(true);
  });

  it('should not declare victory while enemies remain or the wave is active', () => {
    const wm = new WaveManager();
    for (let i = 0; i < 9; i++) {
      playWaveToCompletion(wm);
    }

    // Wave 10 in progress: not a victory yet.
    wm.startNextWave();
    expect(wm.currentWaveIndex).toBe(9);
    expect(wm.isLastWaveCompleted(0)).toBe(false); // wave still active
    while (wm.getNextEnemyToSpawn(60_000) !== null) { /* drain the queue */ }
    expect(wm.isLastWaveCompleted(3)).toBe(false); // enemies still alive

    wm.onEnemyCleared(0);
    expect(wm.isLastWaveCompleted(0)).toBe(true);
  });

  it('should not grow waves beyond the campaign when endless mode is off', () => {
    const wm = new WaveManager();
    for (let i = 0; i < 15; i++) {
      playWaveToCompletion(wm);
    }

    expect(wm.waves.length).toBe(wm.campaignWaveCount);
    expect(wm.currentWaveIndex).toBe(9);
  });

  it('should stop the auto countdown once the campaign is over', () => {
    const wm = new WaveManager();
    wm.setAutoMode(true);
    for (let i = 0; i < 10; i++) {
      playWaveToCompletion(wm);
    }
    wm.autoCountdownMs = 5000;

    wm.updateAutoCountdown(10_000);

    expect(wm.autoCountdownMs).toBe(5000);
    expect(wm.currentWaveIndex).toBe(9);
  });

  it('should calculate exponential HP multiplier for endless waves', () => {
    const wm = new WaveManager();
    wm.setEndlessMode(true);

    // Fast-forward to Wave 11 (index 10)
    for (let i = 0; i < 11; i++) {
      wm.isWaveActive = false;
      wm.startNextWave();
    }

    expect(wm.currentWaveIndex).toBe(10); // Wave 11
    const spawnInfo11 = wm.getNextEnemyToSpawn(1000);
    expect(spawnInfo11?.hpMultiplier).toBeCloseTo(1.12, 2); // 1.12^1
  });
});
