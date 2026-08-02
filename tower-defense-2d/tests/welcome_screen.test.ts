// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WelcomeScreen } from '../src/ui/WelcomeScreen';

describe('WelcomeScreen Component Test', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render overlay, title, subtitle, campaign, traditional and leaderboard buttons', () => {
    const onStart = vi.fn();
    new WelcomeScreen(onStart);

    const overlay = document.getElementById('welcome-screen-overlay');
    expect(overlay).not.toBeNull();

    const title = overlay?.querySelector('.retro-title');
    expect(title?.textContent).toBe('OH MY TD');

    const subtitle = overlay?.querySelector('.retro-subtitle');
    expect(subtitle?.textContent).toContain('RETRO TOWER DEFENSE');

    const campaignBtn = overlay?.querySelector('.retro-btn-campaign');
    expect(campaignBtn).not.toBeNull();
    expect(campaignBtn?.textContent).toBe('MODO CAMPANHA');

    const traditionalBtn = overlay?.querySelector('.retro-btn-traditional');
    expect(traditionalBtn).not.toBeNull();
    expect(traditionalBtn?.textContent).toBe('MODO TRADICIONAL');

    const leaderboardBtn = overlay?.querySelector('.retro-btn-leaderboard');
    expect(leaderboardBtn).not.toBeNull();
    expect(leaderboardBtn?.textContent).toBe('PLACAR GLOBAL');
  });

  it('should trigger onStart with CAMPAIGN when clicking campaign button', () => {
    const onStart = vi.fn();
    new WelcomeScreen(onStart);

    const button = document.querySelector('.retro-btn-campaign') as HTMLButtonElement;
    expect(button).not.toBeNull();

    button.click();

    expect(onStart).toHaveBeenCalledWith('CAMPAIGN');

    const overlay = document.getElementById('welcome-screen-overlay');
    expect(overlay?.style.opacity).toBe('0');
  });

  it('should trigger onStart with TRADITIONAL when clicking traditional button', () => {
    const onStart = vi.fn();
    new WelcomeScreen(onStart);

    const button = document.querySelector('.retro-btn-traditional') as HTMLButtonElement;
    expect(button).not.toBeNull();

    button.click();

    expect(onStart).toHaveBeenCalledWith('TRADITIONAL');

    const overlay = document.getElementById('welcome-screen-overlay');
    expect(overlay?.style.opacity).toBe('0');
  });

  it('should trigger onStart and cleanup overlay when clicking campaign button', () => {
    const onStart = vi.fn();
    const welcomeScreen = new WelcomeScreen(onStart);

    const button = document.querySelector('.retro-btn-campaign') as HTMLButtonElement;
    expect(button).not.toBeNull();

    button.click();

    expect(onStart).toHaveBeenCalledTimes(1);

    const overlay = document.getElementById('welcome-screen-overlay');
    expect(overlay?.style.opacity).toBe('0');
  });

  it('should support explicit destroy call', () => {
    const onStart = vi.fn();
    const welcomeScreen = new WelcomeScreen(onStart);

    welcomeScreen.destroy();

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('should render retro leaderboard button and open leaderboard modal on click', async () => {
    const onStart = vi.fn();
    const mockDb = {
      isConnected: () => true,
      getTop20Leaderboard: vi.fn().mockResolvedValue([
        {
          id: '1',
          username: 'CyberNinja',
          avatar_id: 'solar_prism',
          challenge_mode: 'PADRAO',
          wave_reached: 42,
          total_kills: 1500,
          gold_earned: 9000,
        },
      ]),
    } as any;

    new WelcomeScreen(onStart, mockDb);

    const leaderboardBtn = document.querySelector('.retro-btn-leaderboard') as HTMLButtonElement;
    expect(leaderboardBtn).not.toBeNull();

    leaderboardBtn.click();

    const modalOverlay = document.getElementById('welcome-leaderboard-modal-overlay');
    expect(modalOverlay).not.toBeNull();
    expect(modalOverlay?.classList.contains('hidden')).toBe(false);

    // Wait for async load Leaderboard data
    await Promise.resolve();
    await Promise.resolve();

    expect(modalOverlay?.textContent).toContain('CyberNinja');
    expect(modalOverlay?.textContent).toContain('Onda 42');
  });

  it('should close leaderboard modal when clicking close button', async () => {
    const onStart = vi.fn();
    const mockDb = {
      isConnected: () => true,
      getTop20Leaderboard: vi.fn().mockResolvedValue([]),
    } as any;

    new WelcomeScreen(onStart, mockDb);

    const leaderboardBtn = document.querySelector('.retro-btn-leaderboard') as HTMLButtonElement;
    leaderboardBtn.click();

    const modalOverlay = document.getElementById('welcome-leaderboard-modal-overlay');
    expect(modalOverlay?.classList.contains('hidden')).toBe(false);

    const closeBtn = modalOverlay?.querySelector('.retro-close-btn') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(modalOverlay?.classList.contains('hidden')).toBe(true);
  });
});
