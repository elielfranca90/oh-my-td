import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/engine/EventBus';
import { GameState } from '../src/engine/GameState';
import { WaveManager } from '../src/engine/WaveManager';
describe('Game Flow & Campaign Victory Integration Tests', () => {
  it('should progress from Wave 1 through Wave 10 and trigger victory event emission', () => {
    const state = new GameState();
    const waveManager = new WaveManager();

    const statusListener = vi.fn();
    EventBus.getInstance().on('status:change', statusListener);

    expect(state.status).toBe('PLAYING');

    // Simulate completing all 10 campaign waves
    for (let waveIndex = 0; waveIndex < 10; waveIndex++) {
      const started = waveManager.startNextWave();
      expect(started).toBe(true);
      expect(waveManager.currentWaveIndex).toBe(waveIndex);

      // Empty spawn queue and simulate all enemies killed
      while (waveManager['spawnQueue'].length > 0) {
        waveManager['spawnQueue'].shift();
      }

      const waveEnded = waveManager.onEnemyCleared(0);
      expect(waveEnded).toBe(true);
      expect(waveManager.isWaveActive).toBe(false);
    }

    const lastCompleted = waveManager.isLastWaveCompleted(0);
    expect(lastCompleted).toBe(true);

    state.setStatus('VICTORY');
    expect(state.status).toBe('VICTORY');
    expect(statusListener).toHaveBeenCalledWith('VICTORY');
  });

  it('should handle game over state when base HP reaches 0 and emit status change', () => {
    const state = new GameState();
    const statusListener = vi.fn();
    EventBus.getInstance().on('status:change', statusListener);

    expect(state.baseHp).toBe(10);

    state.takeDamage(10);
    expect(state.baseHp).toBe(0);
    expect(state.status).toBe('GAME_OVER');
    expect(statusListener).toHaveBeenCalledWith('GAME_OVER');
  });
});
