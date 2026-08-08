
export type BGMTrack = 'MAP_1' | 'MAP_2' | 'MAP_3' | 'MAP_4' | 'BOSS';

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

  // BGM Sequencer State
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;
  public isBGMPlaying = false;
  private currentSpeed = 1;
  public tensionLevel = 0.0;
  public currentTrack: BGMTrack = 'MAP_1';

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
  // --- MAP 4 TRACK: GRAVE PASS (Dark Gothic G Minor / E Phrygian Crypt) ---
  private readonly map4Melody: number[] = [
    196.00, 233.08, 293.66, 392.00, 311.13, 293.66, 233.08, 196.00,
    164.81, 196.00, 246.94, 329.63, 246.94, 196.00, 164.81, 196.00,
    174.61, 220.00, 261.63, 349.23, 261.63, 220.00, 174.61, 220.00,
    155.56, 196.00, 233.08, 311.13, 233.08, 196.00, 155.56, 196.00,
  ];
  private readonly map4Bass: number[] = [
    98.00,  98.00, 196.00,  98.00, 82.41, 82.41, 164.81, 82.41,
    87.31,  87.31, 174.61,  87.31, 77.78, 77.78, 155.56, 77.78,
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
      if (saved) {
        const parsed = JSON.parse(saved);
        this.sfxVolume = typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : 0.8;
        this.bgmVolume = typeof parsed.bgmVolume === 'number' ? parsed.bgmVolume : 0.6;
        this.isSfxMuted = Boolean(parsed.isSfxMuted);
        this.isBgmMuted = Boolean(parsed.isBgmMuted);
      }
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

  public ensureContext(): boolean {
    if (!this.ctx) {
      const win = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      this.sfxGainNode = this.ctx.createGain();
      this.bgmGainNode = this.ctx.createGain();
      this.sfxGainNode.connect(this.ctx.destination);
      this.bgmGainNode.connect(this.ctx.destination);

      this.updateNodeVolumes();
    }

    if (this.ctx.state === 'suspended') {
      return false;
    }

    return this.ctx.state === 'running';
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
    if (!this.ctx) {
      const win = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.sfxGainNode = this.ctx.createGain();
      this.bgmGainNode = this.ctx.createGain();
      this.sfxGainNode.connect(this.ctx.destination);
      this.bgmGainNode.connect(this.ctx.destination);

      this.updateNodeVolumes();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.stopBGM();
        if (!this.isBgmMuted) {
          this.startBGM(this.currentSpeed, this.currentTrack);
        }
      }).catch(() => {});
    } else if (!this.isBGMPlaying && !this.isBgmMuted) {
      this.startBGM(this.currentSpeed, this.currentTrack);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
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
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    this.updateNodeVolumes();
    this.savePrefs();
  }

  public toggleBgmMute(): boolean {
    this.isBgmMuted = !this.isBgmMuted;
    this.updateNodeVolumes();
    if (this.isBgmMuted) {
      this.stopBGM();
    } else {
      this.unlockAudio();
      this.startBGM(this.currentSpeed, this.currentTrack);
    }
    this.savePrefs();
    return this.isBgmMuted;
  }

  public setTensionLevel(level: number) {
    this.tensionLevel = Math.max(0, Math.min(1, level));
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
    if (this.currentTrack === 'MAP_4') baseIntervalMs = 135;
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
      melType = 'sawtooth';
      bassType = 'triangle';
      melVol = 0.10;
      bassVol = 0.12;
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
    // Tension Layer: when tensionLevel > 0.4, trigger high octave arpeggio note
    if (this.tensionLevel > 0.4) {
      const tensionOsc = this.ctx.createOscillator();
      const tensionGain = this.ctx.createGain();
      tensionOsc.type = 'sine';
      tensionOsc.frequency.setValueAtTime(melodyFreq * 2, now);
      tensionGain.gain.setValueAtTime(0.04 * this.tensionLevel, now);
      tensionGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      tensionOsc.connect(tensionGain);
      tensionGain.connect(this.bgmGainNode);
      tensionOsc.start(now);
      tensionOsc.stop(now + 0.05);
    }
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
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
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
