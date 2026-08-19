import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';

/** Minimal AudioContext stub — happy-dom does not implement the Web Audio API. */
class FakeAudioContext {
  public static instances: FakeAudioContext[] = [];

  public state: AudioContextState = 'running';
  public currentTime = 0;
  public destination = { connect() {} };
  public closeCount = 0;
  public resumeCount = 0;

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    };
  }

  resume() {
    this.resumeCount++;
    this.state = 'running';
    return Promise.resolve();
  }

  close() {
    this.closeCount++;
    this.state = 'closed';
    return Promise.resolve();
  }
}
class FakeAudioElement {
  public static instances: FakeAudioElement[] = [];
  public src: string;
  public loop = false;
  public volume = 1;
  public paused = true;
  public currentTime = 0;
  public playCallCount = 0;
  public pauseCallCount = 0;
  public shouldRejectPlay = false;

  constructor(src: string) {
    this.src = src;
    FakeAudioElement.instances.push(this);
  }

  public async play(): Promise<void> {
    this.playCallCount++;
    if (this.shouldRejectPlay) {
      throw new Error('NotAllowedError: play failed because the user didn\'t interact yet');
    }
    this.paused = false;
  }

  public pause(): void {
    this.pauseCallCount++;
    this.paused = true;
  }
}

type WindowWithAudio = Window & { AudioContext?: unknown };

describe('AudioManager lifecycle', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    localStorage.clear();
    (window as WindowWithAudio).AudioContext = FakeAudioContext;
  });

  afterEach(() => {
    delete (window as WindowWithAudio).AudioContext;
    localStorage.clear();
  });

  it('creates a single AudioContext lazily', () => {
    const am = new AudioManager();
    expect(FakeAudioContext.instances.length).toBe(0);

    expect(am.ensureContext()).toBe(true);
    am.ensureContext();
    am.ensureContext();

    expect(FakeAudioContext.instances.length).toBe(1);
  });

  it('dispose() closes the AudioContext and stops the BGM', () => {
    const am = new AudioManager();
    am.ensureContext();
    am.startBGM(1, 'MAP_1');
    expect(am.isBGMPlaying).toBe(true);

    const ctx = FakeAudioContext.instances[0];
    am.dispose();

    // The core of C-4: every restart used to leak one context until the browser refused
    // to create more and the game froze inside requestAnimationFrame.
    expect(ctx.closeCount).toBe(1);
    expect(ctx.state).toBe('closed');
    expect(am.isBGMPlaying).toBe(false);
    expect(am.isUnlocked).toBe(false);
  });

  it('does not leak contexts across many restarts', () => {
    for (let restart = 0; restart < 10; restart++) {
      const am = new AudioManager();
      am.ensureContext();
      am.dispose();
    }

    expect(FakeAudioContext.instances.length).toBe(10);
    expect(FakeAudioContext.instances.every(c => c.closeCount === 1)).toBe(true);
  });

  it('creates a fresh context after dispose', () => {
    const am = new AudioManager();
    am.ensureContext();
    am.dispose();

    expect(am.ensureContext()).toBe(true);
    expect(FakeAudioContext.instances.length).toBe(2);
  });

  it('dispose() is idempotent and safe without a context', () => {
    const am = new AudioManager();
    expect(() => am.dispose()).not.toThrow();

    am.ensureContext();
    am.dispose();
    expect(() => am.dispose()).not.toThrow();
    expect(FakeAudioContext.instances[0].closeCount).toBe(1);
  });

  it('requests resume only once while the context stays suspended', () => {
    const am = new AudioManager();
    am.ensureContext();
    const ctx = FakeAudioContext.instances[0];

    // Simulate a context that stays suspended until the real user gesture.
    ctx.state = 'suspended';
    ctx.resume = () => {
      ctx.resumeCount++;
      return new Promise<void>(() => {}); // never settles
    };

    for (let frame = 0; frame < 120; frame++) {
      am.ensureContext();
    }

    // It used to fire one rejected promise per frame (~60/s) before the first gesture.
    expect(ctx.resumeCount).toBe(1);
  });

  it('reports unlocked only once the context is running', () => {
    const am = new AudioManager();
    expect(am.isUnlocked).toBe(false);

    am.unlockAudio();
    expect(am.isUnlocked).toBe(true);
  });

  it('does not start the BGM from unlockAudio (no blip on pause/game-over clicks)', () => {
    const am = new AudioManager();
    am.unlockAudio();
    expect(am.isBGMPlaying).toBe(false);
  });
});

describe('AudioManager preferences validation', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('ignores tampered volumes and clamps out-of-range values', () => {
    localStorage.setItem('td2d_audio_prefs_v1', JSON.stringify({
      sfxVolume: '<img src=x onerror=alert(1)>',
      bgmVolume: 99,
      isSfxMuted: 'yes',
      isBgmMuted: true,
    }));

    const am = new AudioManager();

    expect(am.sfxVolume).toBe(0.8); // invalid type -> default
    expect(am.bgmVolume).toBe(1);   // clamped into [0, 1]
    expect(am.isSfxMuted).toBe(false); // only a real boolean counts
    expect(am.isBgmMuted).toBe(true);
  });

  it('survives a corrupt payload', () => {
    localStorage.setItem('td2d_audio_prefs_v1', 'not json at all');
    const am = new AudioManager();
    expect(am.sfxVolume).toBe(0.8);
    expect(am.bgmVolume).toBe(0.6);
  });
});

describe('AudioManager Menu BGM Theme', () => {
  const originalAudio = globalThis.Audio;

  beforeEach(() => {
    FakeAudioElement.instances = [];
    globalThis.Audio = FakeAudioElement as unknown as typeof Audio;
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    localStorage.clear();
    vi.useRealTimers();
  });

  it('initializes menu theme audio with loop and persisted volume', async () => {
    localStorage.setItem('td2d_audio_prefs_v1', JSON.stringify({ bgmVolume: 0.75, isBgmMuted: false }));
    const am = new AudioManager();
    await am.playMenuTheme('/audio/Game_Main_Theme_Sunlit_Grasses.mp3');

    expect(FakeAudioElement.instances.length).toBe(1);
    const audio = FakeAudioElement.instances[0];
    expect(audio.src).toBe('/audio/Game_Main_Theme_Sunlit_Grasses.mp3');
    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(0.75);
    expect(audio.paused).toBe(false);
    expect(am.isMenuPlaying()).toBe(true);
  });

  it('respects isBgmMuted when starting menu theme', async () => {
    localStorage.setItem('td2d_audio_prefs_v1', JSON.stringify({ bgmVolume: 0.75, isBgmMuted: true }));
    const am = new AudioManager();
    await am.playMenuTheme();

    expect(FakeAudioElement.instances.length).toBe(1);
    const audio = FakeAudioElement.instances[0];
    expect(audio.volume).toBe(0);
    expect(audio.playCallCount).toBe(0);
  });

  it('dynamically updates menu audio volume when setBgmVolume is called', async () => {
    const am = new AudioManager();
    await am.playMenuTheme();

    const audio = FakeAudioElement.instances[0];
    expect(audio.volume).toBe(0.6);

    am.setBgmVolume(0.3);
    expect(audio.volume).toBe(0.3);
  });

  it('pauses and resumes menu theme audio on toggleBgmMute', async () => {
    const am = new AudioManager();
    await am.playMenuTheme();

    const audio = FakeAudioElement.instances[0];
    expect(audio.paused).toBe(false);

    am.toggleBgmMute(); // Mutes
    expect(am.isBgmMuted).toBe(true);
    expect(audio.paused).toBe(true);
    expect(audio.volume).toBe(0);

    am.toggleBgmMute(); // Unmutes
    expect(am.isBgmMuted).toBe(false);
    expect(audio.paused).toBe(false);
    expect(audio.volume).toBe(0.6);
  });

  it('stops menu theme immediately when fade duration is 0', async () => {
    const am = new AudioManager();
    await am.playMenuTheme();

    expect(am.getMenuAudioElement()).not.toBeNull();
    await am.stopMenuTheme(0);

    expect(am.getMenuAudioElement()).toBeNull();
    expect(am.isMenuPlaying()).toBe(false);
  });

  it('performs gradual fade out during stopMenuTheme with timer progression', async () => {
    vi.useFakeTimers();
    const am = new AudioManager();
    await am.playMenuTheme();

    const audio = FakeAudioElement.instances[0];
    const stopPromise = am.stopMenuTheme(500);

    // Advance half of the fadeout time
    vi.advanceTimersByTime(250);
    expect(audio.volume).toBeLessThan(0.6);
    expect(audio.volume).toBeGreaterThan(0);

    // Advance rest of fadeout
    vi.advanceTimersByTime(300);
    await stopPromise;

    expect(am.getMenuAudioElement()).toBeNull();
    expect(audio.paused).toBe(true);
  });

  it('handles autoplay policy rejection and registers interaction listeners', async () => {
    let playAttempt = 0;
    class RejectingAudio extends FakeAudioElement {
      public override async play(): Promise<void> {
        playAttempt++;
        if (playAttempt === 1) {
          throw new Error('NotAllowedError');
        }
        this.paused = false;
      }
    }
    globalThis.Audio = RejectingAudio as unknown as typeof Audio;

    const am = new AudioManager();
    await am.playMenuTheme();
    const audio = FakeAudioElement.instances[0];
    expect(audio.paused).toBe(true);

    // User gesture triggers playback
    window.dispatchEvent(new Event('pointerdown'));
    expect(audio.paused).toBe(false);
  });

  it('cleans up menu audio and event listeners on dispose()', async () => {
    const am = new AudioManager();
    await am.playMenuTheme();

    const audio = FakeAudioElement.instances[0];
    expect(audio.paused).toBe(false);

    am.dispose();
    expect(am.getMenuAudioElement()).toBeNull();
    expect(audio.paused).toBe(true);
  });
});
