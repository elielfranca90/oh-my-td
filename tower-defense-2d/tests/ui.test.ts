import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AchievementManager } from '../src/engine/AchievementManager';
import { AnalyticsManager } from '../src/engine/AnalyticsManager';
import { AudioManager } from '../src/engine/AudioManager';
import type { Game2D } from '../src/engine/Game';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ParticleManager } from '../src/engine/ParticleManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { SpellManager } from '../src/engine/SpellManager';
import { TalentManager } from '../src/engine/TalentManager';
import { TowerManager2D } from '../src/engine/TowerManager';
import { WaveManager } from '../src/engine/WaveManager';
import { FXManager } from '../src/engine/FXManager';
import { UIManager } from '../src/ui/UIManager';

function buildUI() {
  const talentManager = new TalentManager();
  const achievementManager = new AchievementManager(talentManager);
  const analyticsManager = new AnalyticsManager();
  const gameState = new GameState(talentManager);
  const waveManager = new WaveManager();
  const mapManager = new MapManager2D('MAP_1');
  const audioManager = new AudioManager();
  const fxManager = new FXManager();
  const particleManager = new ParticleManager();
  const projectileManager = new ProjectileManager2D();
  const towerManager = new TowerManager2D(
    mapManager, projectileManager, gameState, audioManager, particleManager, talentManager, analyticsManager
  );
  const spellManager = new SpellManager(
    gameState, fxManager, audioManager, particleManager, talentManager, achievementManager
  );

  // Stand-in for Game2D: only the public surface the UI actually consumes.
  const gameStub = {
    gameSpeedMultiplier: 1,
    currentMapId: mapManager.currentMapId,
    getEnemies: () => [],
    changeMap: () => {},
  } as unknown as Game2D;

  const uiManager = new UIManager(
    gameState, waveManager, towerManager, spellManager, audioManager,
    talentManager, achievementManager, analyticsManager, gameStub, () => {}
  );

  return { uiManager, gameState, waveManager, towerManager, gameStub, talentManager };
}

describe('UIManager without a #ui-container', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('constructs without throwing', () => {
    expect(() => buildUI()).not.toThrow();
  });

  it('update() is a safe no-op instead of crashing the game loop', () => {
    const { uiManager } = buildUI();

    // The overlay refs used to be non-null asserted, so a missing container made
    // `update()` throw every frame — which, before the try/finally, killed the loop.
    expect(() => {
      for (let frame = 0; frame < 5; frame++) uiManager.update();
    }).not.toThrow();
  });

  it('switchMobileTab() is a safe no-op', () => {
    const { uiManager } = buildUI();
    expect(() => uiManager.switchMobileTab('SPELLS')).not.toThrow();
    expect(uiManager.activeMobileTab).toBe('SPELLS');
  });
});

describe('UIManager with a mounted container', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ui-container"></div>';
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders and refreshes the top bar from the game state', () => {
    const { uiManager, gameState } = buildUI();

    gameState.gold = 137;
    uiManager.update();

    expect(document.getElementById('gold-val')?.textContent).toBe('137');
    expect(document.getElementById('hp-val')?.textContent).toBe(
      `${gameState.baseHp}/${gameState.maxBaseHp}`
    );
  });

  it('does not rewrite the DOM when nothing changed', () => {
    const { uiManager, gameState } = buildUI();
    gameState.gold = 42;
    uiManager.update();

    const goldEl = document.getElementById('gold-val')!;
    let writes = 0;
    let value = goldEl.textContent ?? '';
    Object.defineProperty(goldEl, 'textContent', {
      get: () => value,
      set: (next: string) => { writes++; value = next; },
      configurable: true,
    });

    for (let frame = 0; frame < 30; frame++) uiManager.update();
    expect(writes).toBe(0); // dirty-checked: 0 writes for 30 frames of identical state

    gameState.gold = 43;
    uiManager.update();
    expect(writes).toBe(1);
  });

  it('mirrors the engine speed multiplier onto the speed buttons', () => {
    const { uiManager, gameStub } = buildUI();

    gameStub.gameSpeedMultiplier = 4;
    uiManager.update();
    expect(document.getElementById('speed-4x')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('speed-1x')?.classList.contains('active')).toBe(false);

    // A restart resets the engine to 1x; the buttons must follow instead of lying.
    gameStub.gameSpeedMultiplier = 1;
    uiManager.update();
    expect(document.getElementById('speed-1x')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('speed-4x')?.classList.contains('active')).toBe(false);
  });

  it('blocks gameplay actions while paused', () => {
    const { uiManager, gameState, waveManager } = buildUI();
    uiManager.update();

    gameState.isPaused = true;
    document.getElementById('next-wave-btn')?.dispatchEvent(new Event('click'));
    expect(waveManager.isWaveActive).toBe(false);

    gameState.isPaused = false;
    document.getElementById('next-wave-btn')?.dispatchEvent(new Event('click'));
    expect(waveManager.isWaveActive).toBe(true);
  });

  it('blocks gameplay actions after the match ended', () => {
    const { uiManager, gameState, waveManager } = buildUI();
    uiManager.update();

    gameState.status = 'GAME_OVER';
    document.getElementById('next-wave-btn')?.dispatchEvent(new Event('click'));
    expect(waveManager.isWaveActive).toBe(false);
  });

  it('escapes achievement data instead of injecting it as HTML', () => {
    localStorage.setItem('td2d_achievements_v1', JSON.stringify({
      FIRST_BLOOD: { unlocked: false, progress: '<img src=x onerror=alert(1)>' },
    }));

    const { uiManager } = buildUI();
    uiManager.update();
    document.getElementById('badges-btn')?.dispatchEvent(new Event('click'));

    const grid = document.getElementById('achievements-grid')!;
    expect(grid.querySelector('img')).toBeNull();
    expect(grid.innerHTML).not.toContain('onerror');
    // The tampered progress was rejected at load time and fell back to 0.
    expect(grid.textContent).toContain('0/1');
  });

  it('shows the victory modal text with the real campaign length', () => {
    const { uiManager, gameState } = buildUI();
    gameState.status = 'VICTORY';
    uiManager.update();

    expect(document.getElementById('modal-overlay')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modal-title')?.textContent).toContain('Victory');
    expect(document.getElementById('modal-desc')?.textContent).toContain('10 Campaign Waves');
  });
});
