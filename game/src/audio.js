// Shadow Vault — audio: tiny synthesized WebAudio bleeps, no sound files.
// The context is created on the first user gesture; everything is silent
// until then, and the M key (or the mute button) silences it again.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._noiseBuffer = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctor();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise(dur, gain, filterFreq) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (!this._noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.2);
      this._noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur);
  }

  step(sneaking) {
    this._noise(0.05, sneaking ? 0.015 : 0.045, sneaking ? 500 : 900);
  }

  coinThrow() {
    this._tone(1150, 0.09, 'sine', 0.08, 0, 700);
  }

  coinClink() {
    this._tone(2400, 0.05, 'triangle', 0.1);
    this._tone(3100, 0.07, 'triangle', 0.07, 0.05);
  }

  pickup() {
    this._tone(660, 0.08, 'sine', 0.09);
    this._tone(990, 0.12, 'sine', 0.09, 0.07);
  }

  alert() {
    this._tone(392, 0.14, 'square', 0.06);
    this._tone(311, 0.2, 'square', 0.06, 0.13);
  }

  spotted() {
    this._tone(880, 0.07, 'square', 0.045);
  }

  caught() {
    this._tone(220, 0.35, 'sawtooth', 0.08, 0, 110);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.16, 'triangle', 0.09, i * 0.11));
  }
}
