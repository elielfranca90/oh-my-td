import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/engine/EventBus';
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

  // A11 (docs/GAME_DESIGN_REVIEW.md): antes, `wave:change` sempre emitia
  // `max: 10` fixo — no endless a HUD lia "onda 27 / 10". Agora o endless
  // emite `Infinity` (o consumidor ignora `max` quando `isEndless` é true).
  describe('A11 — wave:change não emite max:10 fixo no endless', () => {
    it('campanha emite max:10 (teto real de 10 ondas)', () => {
      const wm = new WaveManager();
      let payload: { current: number; max: number; isEndless: boolean } | undefined;
      const unsubscribe = EventBus.getInstance().on('wave:change', (p: typeof payload) => {
        payload = p;
      });

      wm.startNextWave();

      expect(payload?.max).toBe(10);
      expect(payload?.isEndless).toBe(false);
      unsubscribe();
    });

    it('endless emite max:Infinity, nunca o literal 10', () => {
      const wm = new WaveManager();
      wm.setEndlessMode(true);
      let payload: { current: number; max: number; isEndless: boolean } | undefined;
      const unsubscribe = EventBus.getInstance().on('wave:change', (p: typeof payload) => {
        payload = p;
      });

      // Avança até a onda 27 (bem depois do teto de 10 da campanha).
      for (let i = 0; i < 27; i++) {
        wm.isWaveActive = false;
        wm.startNextWave();
      }

      expect(payload?.current).toBe(27);
      expect(payload?.max).toBe(Infinity);
      expect(payload?.isEndless).toBe(true);
      unsubscribe();
    });
  });
});
