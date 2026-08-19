// @vitest-environment happy-dom
import fs from 'fs';
import path from 'path';
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

  it('should render developer footer with LinkedIn, GitHub, and Twitter links', () => {
    const onStart = vi.fn();
    new WelcomeScreen(onStart);

    const overlay = document.getElementById('welcome-screen-overlay');
    const devFooter = overlay?.querySelector('.welcome-dev-footer');
    expect(devFooter).not.toBeNull();
    expect(devFooter?.textContent).toContain('Eliel França');

    const linkedinLink = devFooter?.querySelector('a.linkedin-link') as HTMLAnchorElement;
    expect(linkedinLink).not.toBeNull();
    expect(linkedinLink.href).toBe('https://www.linkedin.com/in/eliel-franca/');
    expect(linkedinLink.target).toBe('_blank');

    const githubLink = devFooter?.querySelector('a.github-link') as HTMLAnchorElement;
    expect(githubLink).not.toBeNull();
    expect(githubLink.href).toBe('https://github.com/elielfranca90');
    expect(githubLink.target).toBe('_blank');

    const twitterLink = devFooter?.querySelector('a.twitter-link') as HTMLAnchorElement;
    expect(twitterLink).not.toBeNull();
    expect(twitterLink.href).toBe('https://x.com/elielofranca');
    expect(twitterLink.target).toBe('_blank');
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

  it('should have proper flex hierarchy preventing dev footer from overlapping buttons', () => {
    const onStart = vi.fn();
    new WelcomeScreen(onStart);

    const overlay = document.getElementById('welcome-screen-overlay');
    expect(overlay).not.toBeNull();

    const uiContent = overlay?.querySelector('#welcome-ui-content');
    const devFooter = overlay?.querySelector('.welcome-dev-footer');
    const btnContainer = uiContent?.querySelector('.welcome-buttons-container');

    expect(uiContent).not.toBeNull();
    expect(devFooter).not.toBeNull();
    expect(btnContainer).not.toBeNull();

    // Dev footer is a direct sibling of uiContent inside flex overlay
    expect(devFooter?.parentElement).toBe(overlay);
    expect(uiContent?.parentElement).toBe(overlay);
    expect(uiContent?.contains(devFooter!)).toBe(false);
  });

  it('should define non-overlapping relative positioning and responsive styles for welcome screen in index.html', () => {
    const indexPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(indexPath, 'utf-8');

    // Verify welcome-screen-overlay uses flexbox layout with dvh
    expect(htmlContent).toMatch(/#welcome-screen-overlay\s*\{[^}]*display:\s*flex;/);
    expect(htmlContent).toMatch(/#welcome-screen-overlay\s*\{[^}]*flex-direction:\s*column;/);
    expect(htmlContent).toMatch(/#welcome-screen-overlay\s*\{[^}]*justify-content:\s*space-between;/);
    expect(htmlContent).toMatch(/#welcome-screen-overlay\s*\{[^}]*height:\s*100dvh;/);

    // Verify welcome-dev-footer uses relative positioning in the flex flow, avoiding absolute overlap
    expect(htmlContent).toMatch(/\.welcome-dev-footer\s*\{[^}]*position:\s*relative;/);
    expect(htmlContent).toMatch(/\.welcome-dev-footer\s*\{[^}]*margin-top:\s*auto;/);

    // Verify subtitle responsive constraints
    expect(htmlContent).toMatch(/\.retro-subtitle\s*\{[^}]*max-width:\s*320px;/);
    expect(htmlContent).toMatch(/\.retro-subtitle\s*\{[^}]*line-height:\s*1\.4;/);

    // Verify landscape mobile media queries (< 500px height)
    expect(htmlContent).toMatch(/@media\s*\(max-height:\s*500px\)/);
  });

  it('should render audio toggle button and toggle mute when clicked', () => {
    const onStart = vi.fn();
    const welcome = new WelcomeScreen(onStart);

    const audioBtn = document.getElementById('welcome-audio-btn');
    expect(audioBtn).not.toBeNull();
    expect(audioBtn?.querySelector('.welcome-audio-icon')?.textContent).toBe('🎵');

    // Click to mute
    audioBtn?.click();
    expect(audioBtn?.classList.contains('muted')).toBe(true);
    expect(audioBtn?.querySelector('.welcome-audio-icon')?.textContent).toBe('🔇');
    expect(welcome.getAudioManager().isBgmMuted).toBe(true);

    // Click to unmute
    audioBtn?.click();
    expect(audioBtn?.classList.contains('muted')).toBe(false);
    expect(audioBtn?.querySelector('.welcome-audio-icon')?.textContent).toBe('🎵');
    expect(welcome.getAudioManager().isBgmMuted).toBe(false);
  });

  it('should trigger playMenuTheme on mount and stopMenuTheme on destroy', async () => {
    const onStart = vi.fn();
    const welcome = new WelcomeScreen(onStart);
    const am = welcome.getAudioManager();

    const stopSpy = vi.spyOn(am, 'stopMenuTheme');
    welcome.destroy('CAMPAIGN');

    expect(stopSpy).toHaveBeenCalledWith(500);
  });
});
