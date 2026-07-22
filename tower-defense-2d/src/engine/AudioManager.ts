export class AudioManager {
  private ctx: AudioContext | null = null;
  public isMuted = false;

  // BGM Sequencer State
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;
  public isBGMPlaying = false;
  private currentSpeed = 1;

  // 32-step Melody (frequencies in Hz)
  private readonly melodyNotes: number[] = [
    261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 392.00, // C Major
    220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00, 329.63, // A Minor
    174.61, 220.00, 261.63, 349.23, 261.63, 220.00, 174.61, 261.63, // F Major
    196.00, 246.94, 293.66, 392.00, 293.66, 246.94, 196.00, 293.66, // G Major
  ];

  // 32-step Bassline (frequencies in Hz)
  private readonly bassNotes: number[] = [
    65.41, 65.41, 130.81, 65.41, 98.00, 65.41, 130.81, 65.41,
    55.00, 55.00, 110.00, 55.00, 82.41, 55.00, 110.00, 55.00,
    43.65, 43.65, 87.31,  43.65, 65.41, 43.65, 87.31,  43.65,
    49.00, 49.00, 98.00,  49.00, 73.42, 49.00, 98.00,  49.00,
  ];

  private ensureContext(): boolean {
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

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
      if (this.ctx) this.ctx.suspend();
    } else {
      this.startBGM(this.currentSpeed);
    }
    return this.isMuted;
  }

  // BGM Control Methods
  public startBGM(speedMultiplier = 1) {
    this.currentSpeed = speedMultiplier;
    if (this.isMuted || this.isBGMPlaying) return;

    if (!this.ensureContext()) return;
    this.isBGMPlaying = true;

    this.scheduleBGMInterval();
  }

  public stopBGM() {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.isBGMPlaying = false;
  }

  public updateBGMTempo(speedMultiplier = 1) {
    this.currentSpeed = speedMultiplier;
    if (this.isBGMPlaying) {
      if (this.bgmIntervalId !== null) {
        clearInterval(this.bgmIntervalId);
      }
      this.scheduleBGMInterval();
    }
  }

  private scheduleBGMInterval() {
    const baseIntervalMs = 140;
    const intervalMs = Math.max(30, baseIntervalMs / this.currentSpeed);

    this.bgmIntervalId = window.setInterval(() => {
      this.playBGMStep();
    }, intervalMs);
  }

  private playBGMStep() {
    if (!this.ctx || this.isMuted) return;

    const melodyFreq = this.melodyNotes[this.bgmStep];
    const bassFreq = this.bassNotes[this.bgmStep];

    const now = this.ctx.currentTime;

    // 1. Melody Note (Square Wave Chiptune)
    const melOsc = this.ctx.createOscillator();
    const melGain = this.ctx.createGain();
    melOsc.type = 'square';
    melOsc.frequency.setValueAtTime(melodyFreq, now);
    melGain.gain.setValueAtTime(0.04, now); // Soft volume
    melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    melOsc.connect(melGain);
    melGain.connect(this.ctx.destination);
    melOsc.start(now);
    melOsc.stop(now + 0.1);

    // 2. Bassline Note (Triangle Wave)
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(bassFreq, now);
    bassGain.gain.setValueAtTime(0.06, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);
    bassOsc.start(now);
    bassOsc.stop(now + 0.12);

    // Advance step (32 steps loop)
    this.bgmStep = (this.bgmStep + 1) % this.melodyNotes.length;
  }

  // 1. Basic Tower Shot (Light Laser/Pew)
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

  // 2. Frost Tower Shot (Crystalline Chirp)
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

  // 3. Cannon Tower Shot (Heavy Thump)
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

  // 4. Artillery Tower Shot (Heavy Boom)
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

  // 5. Coin Chime (Enemy Kill Reward)
  public playCoin() {
    if (!this.ensureContext() || !this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // C5 (523.25Hz) -> E5 (659.25Hz)
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

  // 6. Base Damage (Warning Alert)
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

  // 7. Meteor Ultimate Spell (Explosive Impact)
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

  // 8. Global Freeze Spell (Sweeping Ice Effect)
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

  // 9. Boss Alert (Tense Alarm)
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
