import { describe, expect, it } from 'vitest';
import { WaveManager } from '../src/engine/WaveManager';

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
    expect(spawnInfo11?.hpMultiplier).toBeCloseTo(5.31, 2); // 4.5 * 1.18^1
  });
});
