import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
