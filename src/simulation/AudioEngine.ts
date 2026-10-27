// Web Audio API procedural sound engine for Mosquito Lamp Simulation
export class AudioEngine {
  ctx: AudioContext | null = null;
  isMuted: boolean = true;
  masterGain: GainNode | null = null;
  fanGain: GainNode | null = null;
  fanNode: AudioBufferSourceNode | null = null;
  mosquitoGain: GainNode | null = null;
  mosquitoOsc: OscillatorNode | null = null;
  mosquitoLfo: OscillatorNode | null = null;
  initialized: boolean = false;

  constructor() {
    this.isMuted = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create Fan Ambience Loop (synthesized pink noise + low hum)
      this.setupFanSound();

      // Create Mosquito Whine (FM synthesized)
      this.setupMosquitoSound();

      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext initialization error:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.initialized) {
      if (!muted) this.init();
      return;
    }
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.6, t, 0.05);
    }
  }

  setupFanSound() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    // Generate pink noise for soft vortex air draft
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter for whisper quiet vortex
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 2.0;

    this.fanGain = this.ctx.createGain();
    this.fanGain.gain.value = 0.0; // Starts silent until vortex fan mode is active

    whiteNoise.connect(filter);
    filter.connect(this.fanGain);
    this.fanGain.connect(this.masterGain);

    whiteNoise.start(0);
    this.fanNode = whiteNoise;
  }

  setupMosquitoSound() {
    if (!this.ctx || !this.masterGain) return;
    // Mosquito carrier frequency ~ 680Hz (females flap wings 400-800Hz)
    this.mosquitoOsc = this.ctx.createOscillator();
    this.mosquitoOsc.type = 'sawtooth';
    this.mosquitoOsc.frequency.setValueAtTime(680, this.ctx.currentTime);

    // Subtle wing flap flutter LFO
    this.mosquitoLfo = this.ctx.createOscillator();
    this.mosquitoLfo.frequency.setValueAtTime(14, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(25, this.ctx.currentTime);

    this.mosquitoLfo.connect(lfoGain);
    lfoGain.connect(this.mosquitoOsc.frequency);

    // Resonant bandpass filter to give authentic nasal whine
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 750;
    bp.Q.value = 4;

    this.mosquitoGain = this.ctx.createGain();
    this.mosquitoGain.gain.value = 0.0; // adjusted based on flying insect proximity

    this.mosquitoOsc.connect(bp);
    bp.connect(this.mosquitoGain);
    this.mosquitoGain.connect(this.masterGain);

    this.mosquitoOsc.start(0);
    this.mosquitoLfo.start(0);
  }

  setFanActive(active: boolean, intensity: number = 0.3) {
    if (!this.fanGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.fanGain.gain.cancelScheduledValues(t);
    this.fanGain.gain.setTargetAtTime(active ? intensity * 0.35 : 0.0, t, 0.2);
  }

  updateProximityBuzz(closestDistance: number, insectCount: number) {
    if (!this.mosquitoGain || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    if (insectCount === 0 || closestDistance > 4.0) {
      this.mosquitoGain.gain.setTargetAtTime(0, t, 0.15);
      return;
    }
    // Louder as insects get closer to camera/lamp
    const norm = Math.max(0, 1 - closestDistance / 4.0);
    const targetGain = norm * 0.08 * Math.min(1.5, 0.4 + insectCount * 0.02);
    this.mosquitoGain.gain.setTargetAtTime(targetGain, t, 0.08);

    if (this.mosquitoOsc) {
      // Slight pitch variation
      const targetFreq = 650 + Math.sin(t * 3) * 40;
      this.mosquitoOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
    }
  }

  // Realistic Electric Grid Zap Crackle!
  playZap(power: number = 1.0) {
    if (this.isMuted || !this.initialized || !this.ctx || !this.masterGain) return;
    this.resume();
    try {
      const t = this.ctx.currentTime;

      // 1. Arc Noise Burst (White noise filtered)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(3200, t);
      bandpass.frequency.exponentialRampToValueAtTime(800, t + 0.08);
      bandpass.Q.value = 5.0;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7 * power, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noiseSource.start(t);

      // 2. High Voltage Spark Pop (fast pitch drop sine/triangle)
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(850, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.6 * power, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.08);

      // 3. Sub-bass thump (electric discharge shockwave)
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(120, t);
      sub.frequency.exponentialRampToValueAtTime(35, t + 0.08);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.5 * power, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(t);
      sub.stop(t + 0.1);
    } catch (e) {
      console.warn("Zap sound error:", e);
    }
  }

  playSuctionCapture() {
    if (this.isMuted || !this.initialized || !this.ctx || !this.masterGain) return;
    this.resume();
    try {
      const t = this.ctx.currentTime;
      // Soft vortex "whoosh-thump"
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch (e) {}
  }

  playGlueCapture() {
    if (this.isMuted || !this.initialized || !this.ctx || !this.masterGain) return;
    this.resume();
    try {
      const t = this.ctx.currentTime;
      // Very subtle sticky tap
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.04);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }
}
