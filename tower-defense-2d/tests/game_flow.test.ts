// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/engine/EventBus';
import { GameState, ChallengeMode } from '../src/engine/GameState';
import { WaveManager } from '../src/engine/WaveManager';
import { UIManager } from '../src/ui/UIManager';

describe('Game Flow & Campaign Victory Integration Tests', () => {
  let state: GameState;
  let waveManager: WaveManager;

  const createDummyUIManager = (gameState: GameState, wm: WaveManager) => {
    return new UIManager(
      gameState,
      wm,
      { getTowerCost: () => 50, getTowers: () => [] } as any,
      {} as any,
      {} as any,
      { unlockedTalents: new Set(), stars: 0 } as any,
      { totalCount: 10 } as any,
      {
        isNewRecord: false,
        highScoreWave: 10,
        getMvpTower: () => ({ type: 'BASIC', damage: 100 }),
        getTotalKills: () => 25,
        goldEarned: 500,
        goldSpent: 400,
      } as any,
      { currentMapId: 'MAP_1' } as any,
      () => {}
    );
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="ui-container"></div>
    `;
  });

  it('should progress from Wave 1 through Wave 10 and trigger victory event emission', () => {
    state = new GameState();
    waveManager = new WaveManager();

    const statusListener = vi.fn();
    EventBus.getInstance().on('status:change', statusListener);
    EventBus.getInstance().on('wave:start', () => {
      if (state.status === 'PREPARATION') {
        state.setStatus('PLAYING');
      }
    });

    expect(state.status).toBe('PREPARATION');

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
    state = new GameState();
    const statusListener = vi.fn();
    EventBus.getInstance().on('status:change', statusListener);

    expect(state.baseHp).toBe(10);

    state.takeDamage(10);
    expect(state.baseHp).toBe(0);
    expect(state.status).toBe('GAME_OVER');
    expect(statusListener).toHaveBeenCalledWith('GAME_OVER');
  });

  it('should ensure #modal-overlay is not nested inside #mechanics-modal-overlay (DOM hierarchy fix)', () => {
    state = new GameState();
    waveManager = new WaveManager();
    createDummyUIManager(state, waveManager);

    const mechanicsModal = document.getElementById('mechanics-modal-overlay');
    const modalOverlay = document.getElementById('modal-overlay');

    expect(mechanicsModal).not.toBeNull();
    expect(modalOverlay).not.toBeNull();
    // modalOverlay must NOT be a child of mechanicsModal
    expect(mechanicsModal?.contains(modalOverlay)).toBe(false);
    expect(modalOverlay?.parentElement).toBe(mechanicsModal?.parentElement);
  });

  it('should display Game Over modal when base HP reaches 0 in Sudden Death (Morte Certa)', () => {
    state = new GameState(undefined, 'MORTE_CERTA');
    state.baseHp = 1;
    state.maxBaseHp = 1;
    waveManager = new WaveManager();

    createDummyUIManager(state, waveManager);

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');

    // Initially modal is hidden
    expect(modalOverlay?.classList.contains('hidden')).toBe(true);

    // Take 1 damage -> baseHp reaches 0 -> GAME_OVER
    state.takeDamage(1);
    expect(state.status).toBe('GAME_OVER');

    // Modal overlay must be visible and have Game Over title
    expect(modalOverlay?.classList.contains('hidden')).toBe(false);
    expect(modalTitle?.innerText).toContain('Game Over');
  });

  it('should display Victory modal when status is set to VICTORY after Wave 10', () => {
    state = new GameState();
    waveManager = new WaveManager();

    createDummyUIManager(state, waveManager);

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');

    expect(modalOverlay?.classList.contains('hidden')).toBe(true);

    state.setStatus('VICTORY');

    expect(modalOverlay?.classList.contains('hidden')).toBe(false);
    expect(modalTitle?.innerText).toContain('Vitória');
  });

  it('should display Campaign Victory modal when status is set to VICTORY in campaign mode', () => {
    state = new GameState();
    state.isCampaignMode = true;
    waveManager = new WaveManager();

    createDummyUIManager(state, waveManager);

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');

    expect(modalOverlay?.classList.contains('hidden')).toBe(true);

    state.setStatus('VICTORY');

    expect(modalOverlay?.classList.contains('hidden')).toBe(false);
    expect(modalTitle?.innerText).toContain('Green Valley Concluído');
  });

  it('should not show early call bonus on Wave 1 start button before match starts', () => {
    state = new GameState();
    waveManager = new WaveManager();
    expect(waveManager.currentWaveIndex).toBe(-1);
    expect(waveManager.getEarlyCallBonus()).toBe(0);

    const ui = createDummyUIManager(state, waveManager);
    ui.update(16);

    const startWaveLabel = document.getElementById('start-wave-label');
    expect(startWaveLabel?.textContent).toBe('Iniciar Onda 1');
    expect(startWaveLabel?.textContent).not.toContain('+');
    expect(startWaveLabel?.textContent).not.toContain('g');
  });
});
