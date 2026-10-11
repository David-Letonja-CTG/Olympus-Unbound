/**
 * Sound effects behind one small interface (D9): gameplay asks for a cue, this module decides how it sounds.
 * The placeholder implementation synthesizes every cue with Web Audio, so there are no sound files to license;
 * swapping in recorded sounds later only changes this module.
 */
export type SoundCue =
  | 'spear'
  | 'bow'
  | 'orb'
  | 'hammer'
  | 'sword'
  | 'bolt'
  | 'scythe'
  | 'strike'
  | 'hit'
  | 'crit'
  | 'kill'
  | 'xp'
  | 'gold'
  | 'heal'
  | 'chest'
  | 'levelUp'
  | 'choose'
  | 'hurt'
  | 'enemyShot'
  | 'charge'
  | 'telegraph'
  | 'impact'
  | 'bossRoar'
  | 'synergy'
  | 'elite'
  | 'victory'
  | 'defeat';

interface Tone {
  readonly type: OscillatorType | 'noise';
  readonly from: number;
  readonly to: number;
  readonly duration: number;
  readonly gain: number;
  readonly delay?: number;
}

/** Minimum milliseconds between two plays of the same cue (spec: hud / sound feedback). */
const MIN_INTERVAL: Partial<Record<SoundCue, number>> = {
  hit: 45,
  crit: 60,
  kill: 55,
  xp: 40,
  gold: 60,
  spear: 60,
  bow: 60,
  enemyShot: 120,
  orb: 200,
};

const CUES: Record<SoundCue, readonly Tone[]> = {
  spear: [
    { type: 'sawtooth', from: 900, to: 300, duration: 0.09, gain: 0.08 },
    { type: 'noise', from: 4000, to: 1500, duration: 0.06, gain: 0.05 },
  ],
  bow: [{ type: 'triangle', from: 700, to: 420, duration: 0.07, gain: 0.07 }],
  orb: [{ type: 'sine', from: 1200, to: 1500, duration: 0.05, gain: 0.03 }],
  hammer: [
    { type: 'sine', from: 120, to: 40, duration: 0.25, gain: 0.25 },
    { type: 'noise', from: 800, to: 200, duration: 0.2, gain: 0.1 },
  ],
  sword: [
    { type: 'noise', from: 2500, to: 600, duration: 0.14, gain: 0.09 },
    { type: 'sawtooth', from: 300, to: 180, duration: 0.12, gain: 0.04 },
  ],
  bolt: [
    { type: 'sawtooth', from: 1800, to: 200, duration: 0.18, gain: 0.08 },
    { type: 'noise', from: 6000, to: 2000, duration: 0.15, gain: 0.08 },
  ],
  scythe: [
    { type: 'noise', from: 1200, to: 300, duration: 0.22, gain: 0.08 },
    { type: 'sine', from: 220, to: 110, duration: 0.2, gain: 0.06 },
  ],
  strike: [
    { type: 'noise', from: 5000, to: 200, duration: 0.5, gain: 0.2 },
    { type: 'sawtooth', from: 160, to: 40, duration: 0.5, gain: 0.12 },
  ],
  hit: [{ type: 'square', from: 300, to: 160, duration: 0.04, gain: 0.03 }],
  crit: [{ type: 'square', from: 900, to: 500, duration: 0.06, gain: 0.05 }],
  kill: [{ type: 'triangle', from: 260, to: 90, duration: 0.09, gain: 0.07 }],
  xp: [{ type: 'sine', from: 1300, to: 1700, duration: 0.05, gain: 0.04 }],
  gold: [
    { type: 'square', from: 1800, to: 1800, duration: 0.04, gain: 0.03 },
    { type: 'square', from: 2400, to: 2400, duration: 0.06, gain: 0.03, delay: 0.04 },
  ],
  heal: [{ type: 'sine', from: 500, to: 900, duration: 0.25, gain: 0.08 }],
  chest: [
    { type: 'triangle', from: 600, to: 600, duration: 0.1, gain: 0.08 },
    { type: 'triangle', from: 900, to: 900, duration: 0.1, gain: 0.08, delay: 0.1 },
    { type: 'triangle', from: 1200, to: 1200, duration: 0.2, gain: 0.08, delay: 0.2 },
  ],
  levelUp: [
    { type: 'triangle', from: 520, to: 520, duration: 0.1, gain: 0.1 },
    { type: 'triangle', from: 660, to: 660, duration: 0.1, gain: 0.1, delay: 0.09 },
    { type: 'triangle', from: 880, to: 880, duration: 0.25, gain: 0.1, delay: 0.18 },
  ],
  choose: [{ type: 'sine', from: 700, to: 1100, duration: 0.12, gain: 0.08 }],
  hurt: [{ type: 'sawtooth', from: 220, to: 90, duration: 0.15, gain: 0.12 }],
  enemyShot: [{ type: 'triangle', from: 500, to: 300, duration: 0.08, gain: 0.04 }],
  charge: [{ type: 'sawtooth', from: 90, to: 160, duration: 0.5, gain: 0.07 }],
  telegraph: [{ type: 'sine', from: 180, to: 240, duration: 0.4, gain: 0.08 }],
  impact: [
    { type: 'sine', from: 90, to: 30, duration: 0.4, gain: 0.3 },
    { type: 'noise', from: 1500, to: 100, duration: 0.35, gain: 0.14 },
  ],
  bossRoar: [
    { type: 'sawtooth', from: 70, to: 45, duration: 1.2, gain: 0.2 },
    { type: 'noise', from: 600, to: 150, duration: 1, gain: 0.08 },
  ],
  synergy: [
    { type: 'sine', from: 660, to: 660, duration: 0.15, gain: 0.08 },
    { type: 'sine', from: 990, to: 990, duration: 0.3, gain: 0.08, delay: 0.12 },
  ],
  elite: [{ type: 'sawtooth', from: 110, to: 220, duration: 0.5, gain: 0.08 }],
  victory: [
    { type: 'triangle', from: 523, to: 523, duration: 0.2, gain: 0.12 },
    { type: 'triangle', from: 659, to: 659, duration: 0.2, gain: 0.12, delay: 0.2 },
    { type: 'triangle', from: 784, to: 784, duration: 0.2, gain: 0.12, delay: 0.4 },
    { type: 'triangle', from: 1047, to: 1047, duration: 0.6, gain: 0.12, delay: 0.6 },
  ],
  defeat: [
    { type: 'triangle', from: 392, to: 392, duration: 0.3, gain: 0.1 },
    { type: 'triangle', from: 330, to: 330, duration: 0.3, gain: 0.1, delay: 0.3 },
    { type: 'triangle', from: 262, to: 196, duration: 0.8, gain: 0.1, delay: 0.6 },
  ],
};

const MAX_VOICES = 24;

export class SoundPlayer {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private noise: AudioBuffer | undefined;
  private readonly lastPlayed = new Map<SoundCue, number>();
  private voices = 0;

  constructor(private volume: number) {
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = volume;
      this.master.connect(this.context.destination);
      void this.context.resume().catch(() => undefined);
      // Browsers keep audio suspended until the first key press or click (e.g. an intro on first launch).
      const unlock = () => {
        void this.context?.resume().catch(() => undefined);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('pointerdown', unlock);
      };
      window.addEventListener('keydown', unlock);
      window.addEventListener('pointerdown', unlock);
    } catch {
      // No audio available (old browser or tests): stay silent.
      this.context = undefined;
    }
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  play(cue: SoundCue): void {
    const ctx = this.context;
    if (
      !ctx ||
      !this.master ||
      this.volume <= 0 ||
      ctx.state !== 'running' ||
      this.voices >= MAX_VOICES
    )
      return;
    const now = ctx.currentTime;
    const min = (MIN_INTERVAL[cue] ?? 30) / 1000;
    if (now - (this.lastPlayed.get(cue) ?? -1) < min) return;
    this.lastPlayed.set(cue, now);
    for (const tone of CUES[cue]) this.tone(ctx, this.master, tone, now + (tone.delay ?? 0));
  }

  destroy(): void {
    void this.context?.close().catch(() => undefined);
    this.context = undefined;
  }

  private tone(ctx: AudioContext, out: AudioNode, tone: Tone, start: number): void {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
    gain.connect(out);
    let source: AudioScheduledSourceNode;
    if (tone.type === 'noise') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(tone.from, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, tone.to), start + tone.duration);
      noise.connect(filter);
      filter.connect(gain);
      source = noise;
    } else {
      const osc = ctx.createOscillator();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.from, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, tone.to), start + tone.duration);
      osc.connect(gain);
      source = osc;
    }
    this.voices++;
    source.onended = () => {
      this.voices--;
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + tone.duration + 0.02);
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      // Cosmetic noise only; not gameplay randomness.
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }
}
