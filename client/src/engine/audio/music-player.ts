import { MusicTier } from './music-intensity';
import { barNotes, beatSeconds, HALL_BPM, hallBarNotes, MusicNote, MusicPart } from './music-score';

/** How often the scheduler wakes, and how far ahead it schedules (seconds). */
const TICK_MS = 25;
const AHEAD = 0.15;
/** Volume while paused, as a share of the music volume. */
const DUCK = 0.25;
const FADE_OUT = 2.5;
/** Mix level of each instrument. */
const LEVEL: Record<MusicPart, number> = {
  kick: 0.9,
  snare: 0.55,
  hat: 0.18,
  crash: 0.22,
  frame: 0.6,
  tom: 0.55,
  bass: 0.32,
  guitar: 0.16,
  mute: 0.2,
  lyre: 0.28,
  choir: 0.05,
};

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** What a player plays: the battle music, which follows the run's tier, or the Hall theme outside runs. */
export type MusicPiece = 'battle' | 'hall';

/**
 * The battle music (spec: music): asks the score for each bar at the tier the run calls for and plays it with
 * synthesized instruments, scheduled a little ahead on the audio clock. A tier changes only at a bar's start. It has
 * its own volume, apart from the sound effects', on the sound player's audio context.
 */
export class MusicPlayer {
  private readonly out: GainNode | undefined;
  private readonly mix: GainNode | undefined;
  private noise: AudioBuffer | undefined;
  private drive: Float32Array<ArrayBuffer> | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private tier: MusicTier = 0;
  private wanted: MusicTier = 0;
  private bar = 0;
  private nextBar = -1;
  private volume: number;
  private paused = false;
  private ended = false;

  /** `fadeIn`: seconds to rise from silence to the volume (the Hall theme fades in, spec: music / the hall theme). */
  constructor(
    private readonly ctx: BaseAudioContext | undefined,
    volume: number,
    private readonly piece: MusicPiece = 'battle',
    fadeIn = 0,
  ) {
    this.volume = volume;
    if (!ctx) return;
    try {
      // Mix → a gentle "glue" compressor → a brick-wall limiter (the heavy tiers stay under full scale) → volume.
      this.mix = ctx.createGain();
      this.mix.gain.value = 0.8;
      const glue = ctx.createDynamicsCompressor();
      glue.threshold.value = -16;
      glue.ratio.value = 4;
      glue.attack.value = 0.005;
      glue.release.value = 0.15;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -2;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      this.out = ctx.createGain();
      this.out.gain.value = fadeIn > 0 ? 0 : volume;
      if (fadeIn > 0) this.out.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeIn);
      this.mix.connect(glue);
      glue.connect(limiter);
      limiter.connect(this.out);
      this.out.connect(ctx.destination);
      this.noise = this.makeNoise(ctx);
      this.drive = distortionCurve(60);
      this.timer = setInterval(() => this.schedule(), TICK_MS);
    } catch {
      // No audio (tests, old browsers): silent.
    }
  }

  /** The tier the run calls for; it takes over at the next bar. */
  setTier(tier: MusicTier): void {
    this.wanted = tier;
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.applyGain(0.05);
  }

  /** Paused runs keep the music, much quieter (spec: music / paused). */
  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.applyGain(0.3);
  }

  /** The run is over: fade out, then stop. */
  end(): void {
    if (this.ended || !this.ctx || !this.out) return;
    this.ended = true;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + FADE_OUT);
    setTimeout(() => this.stop(), FADE_OUT * 1000 + 100);
  }

  destroy(): void {
    this.stop();
    this.out?.disconnect();
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private applyGain(ramp: number): void {
    if (!this.ctx || !this.out || this.ended) return;
    const target = this.volume * (this.paused ? DUCK : 1);
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(target, now + ramp);
  }

  /**
   * Plays `count` bars of `tier` (or of the Hall theme, for a Hall player) from `at` (audio-clock seconds), whatever
   * the run calls for; returns when they end.
   * For previews and offline renders of the music (docs, tuning).
   */
  playBars(tier: MusicTier, count: number, at: number): number {
    let t = at;
    const hall = this.piece === 'hall';
    const beat = hall ? 60 / HALL_BPM : beatSeconds(tier);
    for (let i = 0; i < count; i++) {
      for (const note of hall ? hallBarNotes(i) : barNotes(tier, i)) this.play(note, t, beat);
      t += 4 * beat;
    }
    return t;
  }

  /** Schedules every bar that starts within the look-ahead; re-syncs after the page was asleep. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.ended) return;
    const now = ctx.currentTime;
    if (this.nextBar < 0 || this.nextBar < now - 0.1) this.nextBar = now + 0.05;
    while (this.nextBar < now + AHEAD) {
      this.tier = this.wanted;
      const hall = this.piece === 'hall';
      const beat = hall ? 60 / HALL_BPM : beatSeconds(this.tier);
      // Nothing is played at volume 0: no nodes are made.
      if (this.volume > 0)
        for (const note of hall ? hallBarNotes(this.bar) : barNotes(this.tier, this.bar))
          this.play(note, this.nextBar, beat);
      this.nextBar += 4 * beat;
      this.bar++;
    }
  }

  private play(n: MusicNote, barStart: number, beat: number): void {
    const ctx = this.ctx as BaseAudioContext;
    const t = barStart + n.beat * beat;
    const length = n.length * beat;
    const v = n.velocity * LEVEL[n.part];
    switch (n.part) {
      case 'kick':
        return this.drum(t, 150, 45, 0.12, 0.35, v);
      case 'frame':
        this.noiseHit(t, 'lowpass', 900, 0.06, v * 0.35);
        return this.drum(t, 110, 70, 0.2, 0.45, v);
      case 'tom':
        return this.drum(t, 130 + n.pitch * 40, (130 + n.pitch * 40) * 0.6, 0.25, 0.35, v);
      case 'snare':
        this.noiseHit(t, 'bandpass', 1800, 0.18, v);
        return this.tone('triangle', 190, t, 0.002, 0.1, v * 0.5);
      case 'hat':
        return this.noiseHit(t, 'highpass', 7000, 0.04, v);
      case 'crash':
        return this.noiseHit(t, 'highpass', 4000, 1.6, v);
      case 'bass': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 520;
        filter.connect(this.mix as GainNode);
        return this.tone('sawtooth', freq(n.pitch), t, 0.005, length, v, filter);
      }
      case 'guitar':
      case 'mute':
        return this.guitar(
          n.pitch,
          t,
          n.part === 'mute' ? Math.min(length, 0.12) : length,
          v,
          n.part === 'mute',
        );
      case 'lyre':
        this.tone('triangle', freq(n.pitch), t, 0.003, 1.2, v, undefined, true);
        return this.tone('sine', freq(n.pitch + 12), t, 0.003, 0.6, v * 0.3, undefined, true);
      case 'choir':
        return this.choir(n.pitch, t, length, v);
    }
  }

  /** A pitched drum: a sine that drops from `from` to `to` Hz. */
  private drum(t: number, from: number, to: number, drop: number, decay: number, v: number): void {
    const ctx = this.ctx as BaseAudioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + drop);
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc.connect(gain).connect(this.mix as GainNode);
    this.run(osc, t, t + decay + 0.02, gain);
  }

  private noiseHit(
    t: number,
    type: BiquadFilterType,
    cutoff: number,
    decay: number,
    v: number,
  ): void {
    const ctx = this.ctx as BaseAudioContext;
    const src = ctx.createBufferSource();
    src.buffer = this.noise ?? null;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src
      .connect(filter)
      .connect(gain)
      .connect(this.mix as GainNode);
    this.run(src, t, t + decay + 0.02, gain, filter);
  }

  /** A note with a short attack and a release at its end, or a plucked decay. */
  private tone(
    type: OscillatorType,
    hz: number,
    t: number,
    attack: number,
    length: number,
    v: number,
    into?: AudioNode,
    pluck = false,
  ): void {
    const ctx = this.ctx as BaseAudioContext;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(v, t + attack);
    if (pluck) gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    else {
      gain.gain.setValueAtTime(v, t + Math.max(attack, length - 0.04));
      gain.gain.linearRampToValueAtTime(0.0001, t + length);
    }
    osc.connect(gain).connect(into ?? (this.mix as GainNode));
    this.run(osc, t, t + length + 0.02, gain, into);
  }

  /** A power chord: two detuned saws on the root and one on the fifth, driven hard through a "cabinet". */
  private guitar(pitch: number, t: number, length: number, v: number, muted: boolean): void {
    const ctx = this.ctx as BaseAudioContext;
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.drive ?? null;
    const cab = ctx.createBiquadFilter();
    cab.type = 'lowpass';
    cab.frequency.value = muted ? 1100 : 3200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(v, t + 0.005);
    gain.gain.setValueAtTime(v, t + Math.max(0.01, length - 0.05));
    gain.gain.linearRampToValueAtTime(0.0001, t + length);
    shaper
      .connect(cab)
      .connect(gain)
      .connect(this.mix as GainNode);
    const voices: [number, number][] = [
      [pitch, -7],
      [pitch, 7],
      [pitch + 7, 0],
    ];
    voices.forEach(([p, cents], i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq(p);
      osc.detune.value = cents;
      const pre = ctx.createGain();
      pre.gain.value = 0.4;
      osc.connect(pre).connect(shaper);
      // The last voice tears the shared chain down when it ends.
      this.run(
        osc,
        t,
        t + length + 0.02,
        pre,
        ...(i === voices.length - 1 ? [shaper, cab, gain] : []),
      );
    });
  }

  /** A choir pad: detuned saws through a vowel-like band, slow in and out. */
  private choir(pitch: number, t: number, length: number, v: number): void {
    const ctx = this.ctx as BaseAudioContext;
    const vowel = ctx.createBiquadFilter();
    vowel.type = 'bandpass';
    vowel.frequency.value = 900;
    vowel.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(v, t + Math.min(0.6, length / 3));
    gain.gain.setValueAtTime(v, t + length * 0.8);
    gain.gain.linearRampToValueAtTime(0.0001, t + length + 0.4);
    vowel.connect(gain).connect(this.mix as GainNode);
    const detunes = [-15, -6, 6, 15];
    detunes.forEach((cents, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq(pitch);
      osc.detune.value = cents;
      osc.connect(vowel);
      this.run(
        osc,
        t,
        t + length + 0.45,
        undefined,
        ...(i === detunes.length - 1 ? [vowel, gain] : []),
      );
    });
  }

  /** Starts and stops a source, and disconnects it and its chain when it has ended. */
  private run(
    src: AudioScheduledSourceNode,
    start: number,
    stop: number,
    ...chain: (AudioNode | undefined)[]
  ): void {
    src.start(start);
    src.stop(stop);
    src.onended = () => {
      src.disconnect();
      for (const node of chain) node?.disconnect();
    };
  }

  private makeNoise(ctx: BaseAudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Presentation only, never gameplay: a fixed pseudo-random fill (no Math.random, D5 does not apply here).
    let s = 12345;
    for (let i = 0; i < data.length; i++) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      data[i] = (s / 2 ** 32) * 2 - 1;
    }
    return buffer;
  }
}

/** A soft-clipping curve: the more `k`, the harder the drive. */
function distortionCurve(k: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}
