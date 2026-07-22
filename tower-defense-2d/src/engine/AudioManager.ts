export class AudioManager {
  private ctx: AudioContext | null = null;
  public isMuted = false;

  // BGM Sequencer State
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;
  public isBGMPlaying = false;
  private currentSpeed = 1;
  public currentTrack: 'CALM' | 'BOSS' = 'CALM';

  // --- CALM TRACK (C Major / A Minor) ---
  private readonly calmMelody: number[] = [
    261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 392.00,
    220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00, 329.63,
    174.61, 220.00, 261.63, 349.23, 261.63, 220.00, 174.61, 261.63,
    196.00, 246.94, 293.66, 392.00, 293.66, 246.94, 196.00, 293.66,
  ];

  private readonly calmBass: number[] = [
    65.41, 65.41, 130.81, 65.41, 55.00, 55.00, 110.00, 55.00,
    43.65, 43.65, 87.31,  43.65, 49.00, 49.00, 98.00,  49.00,
  ];

  // --- HEAVY SINISTER BOSS TRACK (D Minor / Tritone Dissonance) ---
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

  public ensureContext(): boolean {
    if (this.isMuted) return false;

    if (!this.ctx) {
      const win = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return true;
  }

  // Explicit Audio Unlock method triggered by User Gesture (Click/Key)
  public unlockAudio() {
    this.ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
      if (this.ctx) this.ctx.suspend();
    } else {
      this.unlockAudio();
      this.startBGM(this.currentSpeed, this.currentTrack);
    }
    return this.isMuted;
  }

  // BGM Control Methods
  public startBGM(speedMultiplier = 1, track: 'CALM' | 'BOSS' = 'CALM') {
    this.currentSpeed = speedMultiplier;
    this.currentTrack = track;
    if (this.isMuted) return;

    if (!this.ensureContext()) return;

    if (this.isBGMPlaying) {
      this.updateBGMTempo(speedMultiplier, track);
      return;
    }

    this.isBGMPlaying = true;
    this.scheduleBGMInterval();
  }

  public setTrack(track: 'CALM' | 'BOSS') {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.bgmStep = 0; // Reset step on track change
    if (this.isBGMPlaying) {
      this.stopBGM();
      this.startBGM(this.currentSpeed, track);
    }
  }

  public stopBGM() {
    clearInterval(this.bgmIntervalId ?? undefined);
    this.bgmIntervalId = null;
    this.isBGMPlaying = false;
  }

  public updateBGMTempo(speedMultiplier = 1, track?: 'CALM' | 'BOSS') {
    this.currentSpeed = speedMultiplier;
    if (track) this.currentTrack = track;

    if (this.isBGMPlaying) {
      clearInterval(this.bgmIntervalId ?? undefined);
      this.scheduleBGMInterval();
    }
  }

  private scheduleBGMInterval() {
    const isBoss = this.currentTrack === 'BOSS';
    const baseIntervalMs = isBoss ? 95 : 150;
    const intervalMs = Math.max(25, baseIntervalMs / this.currentSpeed);

    this.bgmIntervalId = window.setInterval(() => {
      this.playBGMStep();
    }, intervalMs);
  }

  private playBGMStep() {
    if (!this.ctx || this.isMuted) return;

    const isBoss = this.currentTrack === 'BOSS';
    const melodyArray = isBoss ? this.bossMelody : this.calmMelody;
    const bassArray = isBoss ? this.bossBass : this.calmBass;

    const melodyFreq = melodyArray[this.bgmStep % melodyArray.length];
    const bassFreq = bassArray[this.bgmStep % bassArray.length];

    const now = this.ctx.currentTime;

    // 1. Melody Note
    const melOsc = this.ctx.createOscillator();
    const melGain = this.ctx.createGain();
    melOsc.type = isBoss ? 'sawtooth' : 'square';
    melOsc.frequency.setValueAtTime(melodyFreq, now);

    const melVol = isBoss ? 0.05 : 0.035;
    const melDur = isBoss ? 0.08 : 0.1;
    melGain.gain.setValueAtTime(melVol, now);
    melGain.gain.exponentialRampToValueAtTime(0.001, now + melDur);

    melOsc.connect(melGain);
    melGain.connect(this.ctx.destination);
    melOsc.start(now);
    melOsc.stop(now + melDur);

    // 2. Bassline Note
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = isBoss ? 'sawtooth' : 'triangle';
    bassOsc.frequency.setValueAtTime(bassFreq, now);

    const bassVol = isBoss ? 0.08 : 0.05;
    const bassDur = isBoss ? 0.1 : 0.12;
    bassGain.gain.setValueAtTime(bassVol, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + bassDur);

    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);
    bassOsc.start(now);
    bassOsc.stop(now + bassDur);

    // Advance step
    this.bgmStep = (this.bgmStep + 1) % melodyArray.length;
  }

  // 1. Basic Tower Shot
  public playBasicShot() {
    if (!this.ensureContext() || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 2. Frost Tower Shot
  public playFrostShot() {
    if (!this.ensureContext() || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1600, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 3. Cannon Tower Shot
  public playCannonShot() {
    if (!this.ensureContext() || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // 4. Artillery Tower Shot
  public playArtilleryShot() {
    if (!this.ensureContext() || !this.ctx) return;
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
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // 5. Coin Chime
  public playCoin() {
    if (!this.ensureContext() || !this.ctx) return;
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
    gain.connect(this.ctx.destination);

    osc1.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.06);

    osc2.start(this.ctx.currentTime + 0.06);
    osc2.stop(this.ctx.currentTime + 0.16);
  }

  // 6. Base Damage
  public playBaseDamage() {
    if (!this.ensureContext() || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // 7. Meteor Ultimate Spell
  public playMeteor() {
    if (!this.ensureContext() || !this.ctx) return;
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
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.7);
  }

  // 8. Global Freeze Spell
  public playFreeze() {
    if (!this.ensureContext() || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // 9. Boss Alert
  public playBossAlert() {
    if (!this.ensureContext() || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.setValueAtTime(622, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
}
