// Original WebAudio sound: no audio files, everything is synthesized.
// Engine hum follows the throttle, wind follows the speed; delivery
// chimes, hard landings thud, water landings splash.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.windGain = null;
    this.windSource = null;
  }

  /** Must be called from a user gesture at least once. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();

    // Engine: two detuned sawtooths through a lowpass.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.value = 55.7;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    this.engineOsc2.start();

    // Wind: looped noise through a bandpass, gain follows airspeed.
    const length = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.windSource.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windSource.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx) {
      void this.ctx.resume();
      this.engineGain.gain.value = muted ? 0 : this.engineGain.gain.value;
    }
  }

  /** Call every frame while flying. */
  update(throttle, speed, airborne) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const freq = 48 + throttle * 78 + (airborne ? 12 : 0);
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(freq * 1.012, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.02 + throttle * 0.05, t, 0.1);
    this.windGain.gain.setTargetAtTime(Math.min(0.09, speed * 0.0016), t, 0.15);
  }

  silence() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, t, 0.1);
    this.windGain.gain.setTargetAtTime(0, t, 0.1);
  }

  blip() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const start = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.14, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  }

  chime() {
    if (!this.ctx || this.muted) return;
    const notes = [659.25, 880.0, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = this.ctx.currentTime + i * 0.11;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  }

  thud() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.32);
  }

  splash() {
    if (!this.ctx || this.muted) return;
    const length = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.25;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }
}
