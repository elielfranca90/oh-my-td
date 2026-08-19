export type BGMTrack = 'MAP_1' | 'MAP_2' | 'MAP_3' | 'MAP_4' | 'BOSS';

/** Persisted volumes are untrusted input: only accept finite numbers inside [0, 1]. */
function readVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export class AudioManager {
  private ctx: AudioContext | null = null;

  // Master Gain Nodes
  private sfxGainNode: GainNode | null = null;
  private bgmGainNode: GainNode | null = null;

  // Volumes & Mute States (0.0 to 1.0)
  public sfxVolume = 0.8;
  public bgmVolume = 0.6;
  public isSfxMuted = false;
  public isBgmMuted = false;

  // Menu Audio State (Theme Loop)
  private menuAudio: HTMLAudioElement | null = null;
  private autoplayUnlockHandler: (() => void) | null = null;
  private isMenuThemeActive = false;
  // BGM Sequencer State
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;
  public isBGMPlaying = false;
  private currentSpeed = 1;
  public tensionLevel = 0.0;
  public currentTrack: BGMTrack = 'MAP_1';

  /** True once the context is actually running (i.e. after a real user gesture). */
  public isUnlocked = false;
  private resumeRequested = false;

  private readonly PREFS_KEY = 'td2d_audio_prefs_v1';

  // --- MAP 1 TRACK: GREEN VALLEY (C Major / A Minor Bucolic) ---
  private readonly map1Melody: number[] = [
    261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 392.00,
    220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00, 329.63,
    174.61, 220.00, 261.63, 349.23, 261.63, 220.00, 174.61, 261.63,
    196.00, 246.94, 293.66, 392.00, 293.66, 246.94, 196.00, 293.66,
  ];
  private readonly map1Bass: number[] = [
    65.41, 65.41, 130.81, 65.41, 55.00, 55.00, 110.00, 55.00,
    43.65, 43.65, 87.31,  43.65, 49.00, 49.00, 98.00,  49.00,
  ];

  // --- MAP 2 TRACK: DEATH PASS (E Minor / B Minor Volcanic) ---
  private readonly map2Melody: number[] = [
    164.81, 196.00, 246.94, 329.63, 246.94, 196.00, 164.81, 246.94,
    146.83, 174.61, 220.00, 293.66, 220.00, 174.61, 146.83, 220.00,
    130.81, 164.81, 196.00, 261.63, 196.00, 164.81, 130.81, 196.00,
    123.47, 146.83, 185.00, 246.94, 185.00, 146.83, 123.47, 185.00,
  ];
  private readonly map2Bass: number[] = [
    82.41, 82.41, 164.81, 82.41, 73.42, 73.42, 146.83, 73.42,
    65.41, 65.41, 130.81, 65.41, 61.74, 61.74, 123.47, 61.74,
  ];

  // --- MAP 3 TRACK: CITADEL BREACH (Dark Synthwave A Minor) ---
  private readonly map3Melody: number[] = [
    220.00, 277.18, 329.63, 440.00, 554.37, 440.00, 329.63, 277.18,
    174.61, 220.00, 261.63, 349.23, 440.00, 349.23, 261.63, 220.00,
    207.65, 261.63, 311.13, 415.30, 523.25, 415.30, 311.13, 261.63,
    196.00, 246.94, 293.66, 392.00, 493.88, 392.00, 293.66, 246.94,
  ];
  private readonly map3Bass: number[] = [
    110.00, 110.00, 220.00, 110.00, 87.31, 87.31, 174.61, 87.31,
    103.83, 103.83, 207.65, 103.83, 98.00, 98.00, 196.00, 98.00,
  ];

  // --- MAP 4 TRACK: GRAVEYARD SOULS (F Minor / G# Minor Gothic) ---
  private readonly map4Melody: number[] = [
    174.61, 207.65, 261.63, 349.23, 261.63, 207.65, 174.61, 261.63,
    155.56, 196.00, 233.08, 311.13, 233.08, 196.00, 155.56, 233.08,
    138.59, 174.61, 207.65, 277.18, 207.65, 174.61, 138.59, 207.65,
    130.81, 164.81, 196.00, 261.63, 196.00, 164.81, 130.81, 196.00,
  ];
  private readonly map4Bass: number[] = [
    87.31, 87.31, 174.61, 87.31, 77.78, 77.78, 155.56, 77.78,
    69.30, 69.30, 138.59, 69.30, 65.41, 65.41, 130.81, 65.41,
  ];

  // --- BOSS TRACK (D Minor / Tritone Dissonance) ---
  private readonly bossMelody: number[] = [
    293.66, 311.13, 293.66, 415.30, 293.66, 311.13, 587.33, 415.30,
    220.00, 233.08, 220.00, 311.13, 440.00, 311.13, 233.08, 220.00,
    293.66, 311.13, 415.30, 587.33, 415.30, 311.13, 293.66, 415.30,
    220.00, 233.08, 311.13, 440.00, 311.13, 233.08, 220.00, 155.56,
  ];
  private readonly bossBass: number[] = [
    73.42, 73.42, 146.83, 73.42, 77.78, 77.78, 155.56, 77.78,
    55.00, 55.00, 110.00, 55.00, 103.83, 103.83, 207.65, 103.83,
  ];

  constructor() {
    this.loadPrefs();
  }

  private loadPrefs() {
    try {
      const saved = localStorage.getItem(this.PREFS_KEY);
      if (!saved) return;

      const parsed: unknown = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null) return;
      const raw = parsed as Record<string, unknown>;

      this.sfxVolume = readVolume(raw.sfxVolume, 0.8);
      this.bgmVolume = readVolume(raw.bgmVolume, 0.6);
      this.isSfxMuted = raw.isSfxMuted === true;
      this.isBgmMuted = raw.isBgmMuted === true;
    } catch {
      // Ignore
    }
  }

  public savePrefs() {
    try {
      localStorage.setItem(this.PREFS_KEY, JSON.stringify({
        sfxVolume: this.sfxVolume,
        bgmVolume: this.bgmVolume,
        isSfxMuted: this.isSfxMuted,
        isBgmMuted: this.isBgmMuted,
      }));
    } catch {
      // Ignore
    }
  }

  /** Creates the AudioContext + gain graph once. Shared by ensureContext/unlockAudio. */
  private createContext(): boolean {
    if (this.ctx) return true;

    const win = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioCtx = window.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return false;

    this.ctx = new AudioCtx();
    this.sfxGainNode = this.ctx.createGain();
    this.bgmGainNode = this.ctx.createGain();
    this.sfxGainNode.connect(this.ctx.destination);
    this.bgmGainNode.connect(this.ctx.destination);
    this.updateNodeVolumes();

    return true;
  }

  /**
   * Requests a resume at most once per pending attempt. It used to be fired on every
   * frame before the first user gesture, producing ~60 rejected promises per second.
   */
  private requestResume() {
    if (!this.ctx || this.resumeRequested) return;
    this.resumeRequested = true;
    this.ctx
      .resume()
      .then(() => {
        this.resumeRequested = false;
        if (this.ctx && this.ctx.state === 'running') this.isUnlocked = true;
      })
      .catch(() => {
        this.resumeRequested = false;
      });
  }

  public ensureContext(): boolean {
    if (!this.createContext() || !this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      this.requestResume();
      return false;
    }

    const running = this.ctx.state === 'running';
    if (running) this.isUnlocked = true;
    return running;
  }

  public dispose() {
    this.removeAutoplayUnlockHandler();
    if (this.menuAudio) {
      try {
        this.menuAudio.pause();
        this.menuAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.menuAudio = null;
    }
    this.isMenuThemeActive = false;

    this.stopBGM();

    const ctx = this.ctx;
    this.ctx = null;
    this.sfxGainNode = null;
    this.bgmGainNode = null;
    this.isUnlocked = false;
    this.resumeRequested = false;

    if (!ctx) return;
    try {
      if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
        const closing = ctx.close();
        if (closing && typeof closing.catch === 'function') closing.catch(() => {});
      }
    } catch {
      // Ignore: a context that refuses to close is still dropped from our graph.
    }
  }

  private updateNodeVolumes() {
    if (this.sfxGainNode && this.ctx) {
      const vol = this.isSfxMuted ? 0 : this.sfxVolume;
      this.sfxGainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
    if (this.bgmGainNode && this.ctx) {
      const vol = this.isBgmMuted ? 0 : this.bgmVolume;
      this.bgmGainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  public unlockAudio() {
    if (!this.createContext() || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.requestResume();
      return;
    }

    this.isUnlocked = this.ctx.state === 'running';
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = readVolume(vol, 0.8);
    this.updateNodeVolumes();
    this.savePrefs();
  }

  public toggleSfxMute(): boolean {
    this.isSfxMuted = !this.isSfxMuted;
    this.updateNodeVolumes();
    this.savePrefs();
    return this.isSfxMuted;
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = readVolume(vol, 0.6);
    this.updateNodeVolumes();
    if (this.menuAudio) {
      this.menuAudio.volume = this.isBgmMuted ? 0 : this.bgmVolume;
    }
    this.savePrefs();
  }

  public setTensionLevel(level: number) {
    this.tensionLevel = Math.max(0.0, Math.min(1.0, level));
  }

  public toggleBgmMute(): boolean {
    this.isBgmMuted = !this.isBgmMuted;
    this.updateNodeVolumes();
    if (this.menuAudio) {
      this.menuAudio.volume = this.isBgmMuted ? 0 : this.bgmVolume;
      if (this.isBgmMuted) {
        this.menuAudio.pause();
      } else if (this.isMenuThemeActive) {
        this.menuAudio.play().catch(() => {});
      }
    }

    if (this.isBgmMuted) {
      this.stopBGM();
    } else if (!this.menuAudio) {
      this.unlockAudio();
      if (this.isUnlocked) {
        this.startBGM(this.currentSpeed, this.currentTrack);
      }
    }
    this.savePrefs();
    return this.isBgmMuted;
  }

  // --- MENU BGM METHODS ---
  private removeAutoplayUnlockHandler() {
    if (this.autoplayUnlockHandler && typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.autoplayUnlockHandler, { capture: true });
      window.removeEventListener('keydown', this.autoplayUnlockHandler, { capture: true });
      this.autoplayUnlockHandler = null;
    }
  }

  public async playMenuTheme(audioSrc: string = '/audio/Game_Main_Theme_Sunlit_Grasses.mp3'): Promise<void> {
    this.isMenuThemeActive = true;
    this.removeAutoplayUnlockHandler();

    if (typeof Audio === 'undefined') {
      return;
    }

    if (!this.menuAudio) {
      try {
        this.menuAudio = new Audio(audioSrc);
        this.menuAudio.loop = true;
      } catch {
        return;
      }
    }

    this.menuAudio.volume = this.isBgmMuted ? 0 : this.bgmVolume;

    if (this.isBgmMuted) {
      return;
    }

    try {
      const playPromise = this.menuAudio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch {
      // Autoplay blocked by browser: listen for first interaction
      const unlockAndPlay = () => {
        this.removeAutoplayUnlockHandler();
        if (this.isMenuThemeActive && this.menuAudio && !this.isBgmMuted) {
          this.menuAudio.play().catch(() => {});
        }
      };
      this.autoplayUnlockHandler = unlockAndPlay;
      if (typeof window !== 'undefined') {
        window.addEventListener('pointerdown', unlockAndPlay, { once: true, capture: true });
        window.addEventListener('keydown', unlockAndPlay, { once: true, capture: true });
      }
    }
  }

  public async stopMenuTheme(fadeOutDurationMs: number = 500): Promise<void> {
    this.isMenuThemeActive = false;
    this.removeAutoplayUnlockHandler();

    const audio = this.menuAudio;
    if (!audio) return;

    if (fadeOutDurationMs <= 0 || audio.paused || this.isBgmMuted || audio.volume === 0) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.menuAudio = null;
      return;
    }

    const initialVolume = audio.volume;
    const steps = 10;
    const stepTime = fadeOutDurationMs / steps;

    const { promise, resolve } = typeof Promise.withResolvers === 'function'
      ? Promise.withResolvers<void>()
      : (() => {
          let res!: () => void;
          const p = new Promise<void>((r) => { res = r; });
          return { promise: p, resolve: res };
        })();

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(interval);
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // Ignore
        }
        if (this.menuAudio === audio) {
          this.menuAudio = null;
        }
        resolve();
      } else {
        const factor = 1 - currentStep / steps;
        audio.volume = Math.max(0, initialVolume * factor);
      }
    }, stepTime);

    return promise;
  }
  public getMenuAudioElement(): HTMLAudioElement | null {
    return this.menuAudio;
  }

  public isMenuPlaying(): boolean {
    return this.isMenuThemeActive && !!this.menuAudio && !this.menuAudio.paused;
  }

  // BGM Control Methods
  public startBGM(speedMultiplier = 1, track: BGMTrack = 'MAP_1') {
    this.currentSpeed = speedMultiplier;
    this.currentTrack = track;
    if (this.isBgmMuted) return;

    if (!this.ensureContext()) return;

    if (this.isBGMPlaying) {
      this.updateBGMTempo(speedMultiplier, track);
      return;
    }

    this.isBGMPlaying = true;
    this.bgmStep = 0;
    this.scheduleBGMInterval();
  }

  public setTrack(track: BGMTrack) {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.bgmStep = 0;
    if (this.isBGMPlaying && !this.isBgmMuted) {
      this.stopBGM();
      this.startBGM(this.currentSpeed, track);
    }
  }

  public stopBGM() {
    clearInterval(this.bgmIntervalId ?? undefined);
    this.bgmIntervalId = null;
    this.isBGMPlaying = false;
  }

  public updateBGMTempo(speedMultiplier = 1, track?: BGMTrack) {
    const trackChanged = track !== undefined && track !== this.currentTrack;
    const speedChanged = speedMultiplier !== this.currentSpeed;

    if (track) this.currentTrack = track;
    this.currentSpeed = speedMultiplier;

    if (this.isBGMPlaying && !this.isBgmMuted && (trackChanged || speedChanged)) {
      clearInterval(this.bgmIntervalId ?? undefined);
      this.scheduleBGMInterval();
    }
  }

  private scheduleBGMInterval() {
    let baseIntervalMs = 150;
    if (this.currentTrack === 'MAP_2') baseIntervalMs = 110;
    if (this.currentTrack === 'MAP_3') baseIntervalMs = 125;
    if (this.currentTrack === 'MAP_4') baseIntervalMs = 140;
    if (this.currentTrack === 'BOSS') baseIntervalMs = 95;

    const intervalMs = Math.max(25, baseIntervalMs / this.currentSpeed);

    this.bgmIntervalId = window.setInterval(() => {
      this.playBGMStep();
    }, intervalMs);
  }

  private playBGMStep() {
    if (!this.ctx || this.isBgmMuted || this.ctx.state !== 'running' || !this.bgmGainNode) return;

    let melodyArray = this.map1Melody;
    let bassArray = this.map1Bass;
    let melType: OscillatorType = 'square';
    let bassType: OscillatorType = 'triangle';
    let melVol = 0.09;
    let bassVol = 0.10;

    if (this.currentTrack === 'MAP_2') {
      melodyArray = this.map2Melody;
      bassArray = this.map2Bass;
      melType = 'sawtooth';
      bassType = 'sawtooth';
      melVol = 0.10;
      bassVol = 0.12;
    } else if (this.currentTrack === 'MAP_3') {
      melodyArray = this.map3Melody;
      bassArray = this.map3Bass;
      melType = 'square';
      bassType = 'square';
      melVol = 0.11;
      bassVol = 0.13;
    } else if (this.currentTrack === 'MAP_4') {
      melodyArray = this.map4Melody;
      bassArray = this.map4Bass;
      melType = 'sine';
      bassType = 'triangle';
      melVol = 0.12;
      bassVol = 0.14;
    } else if (this.currentTrack === 'BOSS') {
      melodyArray = this.bossMelody;
      bassArray = this.bossBass;
      melType = 'sawtooth';
      bassType = 'sawtooth';
      melVol = 0.14;
      bassVol = 0.16;
    }

    const melodyFreq = melodyArray[this.bgmStep % melodyArray.length];
    const bassFreq = bassArray[this.bgmStep % bassArray.length];

    const now = this.ctx.currentTime;

    // 1. Melody Note
    const melOsc = this.ctx.createOscillator();
    const melGain = this.ctx.createGain();
    melOsc.type = melType;
    melOsc.frequency.setValueAtTime(melodyFreq, now);

    const melDur = 0.09;
    melGain.gain.setValueAtTime(melVol, now);
    melGain.gain.exponentialRampToValueAtTime(0.001, now + melDur);

    melOsc.connect(melGain);
    melGain.connect(this.bgmGainNode);
    melOsc.start(now);
    melOsc.stop(now + melDur);

    // 2. Bassline Note
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = bassType;
    bassOsc.frequency.setValueAtTime(bassFreq, now);

    const bassDur = 0.12;
    bassGain.gain.setValueAtTime(bassVol, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + bassDur);

    bassOsc.connect(bassGain);
    bassGain.connect(this.bgmGainNode);
    bassOsc.start(now);
    bassOsc.stop(now + bassDur);

    this.bgmStep = (this.bgmStep + 1) % melodyArray.length;
  }

  // --- SOUND EFFECTS ---
  public playBasicShot() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playFrostShot() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1600, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playCannonShot() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.18);

    // Lowpass abafa os harmônicos ásperos do square wave: sem ele, o Canhão (fireRate 90,
    // 2º mais rápido depois da Basic) estourava a mixagem quando várias unidades disparavam
    // juntas em campo. O ganho também caiu de 0.25 para 0.18 pelo mesmo motivo.
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  public playArtilleryShot() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  public playCoin() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGainNode);

    osc1.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.06);

    osc2.start(this.ctx.currentTime + 0.06);
    osc2.stop(this.ctx.currentTime + 0.16);
  }

  public playBaseDamage() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playMeteor() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.7);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.7);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.7);
  }

  public playFreeze() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  public playBossAlert() {
    if (!this.ensureContext() || !this.ctx || this.isSfxMuted || !this.sfxGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.setValueAtTime(622, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
}
