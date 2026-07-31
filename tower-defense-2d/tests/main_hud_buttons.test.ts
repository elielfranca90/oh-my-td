// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { UIManager } from '../src/ui/UIManager';
import { GameState } from '../src/engine/GameState';

describe('Main HUD Buttons Integration Test', () => {
  let gameState: GameState;

  const createDummyUIManager = () => {
    gameState = new GameState();
    return new UIManager(
      gameState,
      {} as any,
      { getTowerCost: () => 50 } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { mapManager: { currentMapId: 'map_1' } } as any,
      () => {}
    );
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="ui-container"></div>
    `;
  });

  it('should render main-leaderboard-btn and main-profile-btn in HUD right controls', () => {
    createDummyUIManager();

    const leaderboardBtn = document.getElementById('main-leaderboard-btn');
    const profileBtn = document.getElementById('main-profile-btn');

    expect(leaderboardBtn).not.toBeNull();
    expect(profileBtn).not.toBeNull();
    expect(leaderboardBtn?.textContent).toContain('Placar Global');
    expect(profileBtn?.textContent).toContain('Perfil');
  });

  it('should open leaderboard modal when clicking main-leaderboard-btn', () => {
    createDummyUIManager();
    const leaderboardBtn = document.getElementById('main-leaderboard-btn');
    const leaderboardOverlay = document.getElementById('leaderboard-modal-overlay');

    expect(leaderboardOverlay?.classList.contains('hidden')).toBe(true);

    leaderboardBtn?.click();

    expect(leaderboardOverlay?.classList.contains('hidden')).toBe(false);
  });

  it('should open profile modal when clicking main-profile-btn', () => {
    createDummyUIManager();
    const profileBtn = document.getElementById('main-profile-btn');
    const profileOverlay = document.getElementById('profile-modal-overlay');

    expect(profileOverlay?.classList.contains('hidden')).toBe(true);

    profileBtn?.click();

    expect(profileOverlay?.classList.contains('hidden')).toBe(false);
  });

  it('should allow opening, closing, and reopening modals repeatedly', () => {
    createDummyUIManager();
    const leaderboardBtn = document.getElementById('main-leaderboard-btn');
    const profileBtn = document.getElementById('main-profile-btn');
    const leaderboardOverlay = document.getElementById('leaderboard-modal-overlay')!;
    const profileOverlay = document.getElementById('profile-modal-overlay')!;
    const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn')!;
    const closeProfileBtn = document.getElementById('close-profile-btn')!;

    // 1. Open Leaderboard
    leaderboardBtn?.click();
    expect(leaderboardOverlay.classList.contains('hidden')).toBe(false);
    expect(profileOverlay.classList.contains('hidden')).toBe(true);

    // 2. Close Leaderboard
    closeLeaderboardBtn.click();
    expect(leaderboardOverlay.classList.contains('hidden')).toBe(true);
    expect(profileOverlay.classList.contains('hidden')).toBe(true);

    // 3. Open Profile
    profileBtn?.click();
    expect(profileOverlay.classList.contains('hidden')).toBe(false);
    expect(leaderboardOverlay.classList.contains('hidden')).toBe(true);

    // 4. Close Profile
    closeProfileBtn.click();
    expect(profileOverlay.classList.contains('hidden')).toBe(true);
    expect(leaderboardOverlay.classList.contains('hidden')).toBe(true);

    // 5. Reopen Leaderboard
    leaderboardBtn?.click();
    expect(leaderboardOverlay.classList.contains('hidden')).toBe(false);

    // 6. Directly click Profile without manually closing Leaderboard (should switch cleanly)
    profileBtn?.click();
    expect(profileOverlay.classList.contains('hidden')).toBe(false);
    expect(leaderboardOverlay.classList.contains('hidden')).toBe(true);
  });

  it('should restore Settings modal when closing sub-modal opened from Settings', () => {
    createDummyUIManager();
    const settingsBtn = document.getElementById('settings-toggle-btn')!;
    const settingsProfileBtn = document.getElementById('settings-profile-btn')!;
    const closeProfileBtn = document.getElementById('close-profile-btn')!;

    const settingsOverlay = document.getElementById('settings-modal-overlay')!;
    const profileOverlay = document.getElementById('profile-modal-overlay')!;

    // 1. Open Settings
    settingsBtn.click();
    expect(settingsOverlay.classList.contains('hidden')).toBe(false);

    // 2. Click Profile inside Settings
    settingsProfileBtn.click();
    expect(profileOverlay.classList.contains('hidden')).toBe(false);
    expect(settingsOverlay.classList.contains('hidden')).toBe(true);

    // 3. Close Profile -> Settings should be restored!
    closeProfileBtn.click();
    expect(profileOverlay.classList.contains('hidden')).toBe(true);
    expect(settingsOverlay.classList.contains('hidden')).toBe(false);
  });

  it('should clean up EventBus subscriptions on destroy()', () => {
    const ui = createDummyUIManager();
    expect(() => ui.destroy()).not.toThrow();
  });
  it('should render speed and auto mode buttons in HUD', () => {
    createDummyUIManager();

    const speed1x = document.getElementById('btn-speed-1x');
    const speed2x = document.getElementById('btn-speed-2x');
    const speed4x = document.getElementById('btn-speed-4x');
    const autoBtn = document.getElementById('btn-auto-mode');

    expect(speed1x).not.toBeNull();
    expect(speed2x).not.toBeNull();
    expect(speed4x).not.toBeNull();
    expect(autoBtn).not.toBeNull();
  });

  it('should toggle game speed multiplier and active class when speed buttons are clicked', () => {
    const mockGame = { gameSpeedMultiplier: 1, mapManager: { currentMapId: 'map_1' } };
    const gameState = new GameState();
    new UIManager(
      gameState,
      {} as any,
      { getTowerCost: () => 50 } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      mockGame as any,
      () => {}
    );

    const speed1x = document.getElementById('btn-speed-1x');
    const speed2x = document.getElementById('btn-speed-2x');
    const speed4x = document.getElementById('btn-speed-4x');

    expect(speed1x?.classList.contains('active')).toBe(true);

    speed2x?.click();
    expect(mockGame.gameSpeedMultiplier).toBe(2);
    expect(speed2x?.classList.contains('active')).toBe(true);
    expect(speed1x?.classList.contains('active')).toBe(false);

    speed4x?.click();
    expect(mockGame.gameSpeedMultiplier).toBe(4);
    expect(speed4x?.classList.contains('active')).toBe(true);
    expect(speed2x?.classList.contains('active')).toBe(false);
  });

  it('should toggle auto mode state and active class when btn-auto-mode is clicked', () => {
    let autoModeState = false;
    const mockWaveManager = {
      isAutoMode: false,
      setAutoMode: (val: boolean) => {
        mockWaveManager.isAutoMode = val;
      },
    };
    const gameState = new GameState();
    new UIManager(
      gameState,
      mockWaveManager as any,
      { getTowerCost: () => 50 } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { mapManager: { currentMapId: 'map_1' } } as any,
      () => {}
    );

    const autoBtn = document.getElementById('btn-auto-mode');
    expect(autoBtn?.classList.contains('active')).toBe(false);

    autoBtn?.click();
    expect(mockWaveManager.isAutoMode).toBe(true);
    expect(autoBtn?.classList.contains('active')).toBe(true);

    autoBtn?.click();
    expect(mockWaveManager.isAutoMode).toBe(false);
    expect(autoBtn?.classList.contains('active')).toBe(false);
  });
});
