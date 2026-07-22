export class AudioManager {
  private ctx: AudioContext | null = null;
  public isMuted = false;

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
    if (this.isMuted && this.ctx) {
      this.ctx.suspend();
    }
    return this.isMuted;
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
