import { RECORDED, SampleLayer } from './recorded';
import { unlockOnGesture } from './unlock';

/**
 * Sound effects behind one small interface (D9): gameplay asks for a cue, this module decides how it sounds. Every
 * cue is synthesized with Web Audio (spec: hud / sound feedback), so there are no sound files to license: layered
 * oscillators and filtered noise with envelopes, filter sweeps and drive, a generated room reverb, buses with their
 * own voice limits, and a limiter before the master volume. Sounds from the world are panned and faded by where
 * they happen relative to the view. Swapping in recorded sounds later only changes this module.
 */
export type SoundCue =
  // Weapons and the gods' abilities.
  | 'spear'
  | 'bow'
  | 'trident'
  | 'orb'
  | 'hammer'
  | 'sword'
  | 'bolt'
  | 'scythe'
  | 'bident'
  | 'athenaSpear'
  | 'strike'
  | 'tartarus'
  | 'tidal'
  | 'gaze'
  | 'torches'
  | 'stars'
  | 'gust'
  | 'heartstring'
  | 'apple'
  | 'pipes'
  | 'moonbow'
  | 'sunray'
  | 'stolenfire'
  // Hits and kills.
  | 'hit'
  | 'hitLightning'
  | 'hitFire'
  | 'hitShadow'
  | 'crit'
  | 'kill'
  | 'killElite'
  | 'killBoss'
  // A prop broken (spec: arena-generation / breakable props).
  | 'shatter'
  // The player.
  | 'hurt'
  | 'revive'
  | 'xp'
  | 'gold'
  | 'heal'
  | 'chest'
  // Enemies and bosses.
  | 'enemyShot'
  | 'charge'
  | 'telegraph'
  | 'rumble'
  | 'bellow'
  | 'summon'
  | 'impact'
  | 'whoosh'
  | 'bossRoar'
  // The interface and the run.
  | 'levelUp'
  | 'choose'
  | 'synergy'
  | 'gather'
  | 'apotheosis'
  | 'elite'
  | 'gate'
  | 'realm'
  | 'victory'
  | 'defeat'
  // The menus (spec: hud / menu sounds).
  | 'menuSelect'
  | 'menuConfirm';

type Bus = 'weapon' | 'impact' | 'enemy' | 'player' | 'ui';

/** One layer of a cue: an oscillator or filtered noise, with its own envelope. Times in seconds. */
interface Voice {
  readonly wave: OscillatorType | 'noise';
  /** Pitch (Hz) or, for noise, the filter's cutoff at the start and the end. */
  readonly from: number;
  readonly to: number;
  readonly duration: number;
  readonly gain: number;
  readonly attack?: number;
  readonly delay?: number;
  /** Noise filter (bandpass by default) and its resonance. */
  readonly filter?: BiquadFilterType;
  readonly q?: number;
  /** A second oscillator this many cents apart: a thicker, chorused tone. */
  readonly detune?: number;
  /** Waveshaper drive 0–1: grit and weight. */
  readonly drive?: number;
}

interface Cue {
  readonly bus: Bus;
  readonly voices: readonly Voice[];
  /** Share of the sound sent to the reverb. */
  readonly reverb?: number;
  /** Minimum milliseconds between two plays (spec: hud / sound feedback). */
  readonly gap?: number;
  /** Random pitch spread, ± this share (default 0.04). */
  readonly vary?: number;
}

const n = (
  from: number,
  to: number,
  duration: number,
  gain: number,
  extra: Partial<Voice> = {},
): Voice => ({
  wave: 'noise',
  from,
  to,
  duration,
  gain,
  ...extra,
});
const o = (
  wave: OscillatorType,
  from: number,
  to: number,
  duration: number,
  gain: number,
  extra: Partial<Voice> = {},
): Voice => ({ wave, from, to, duration, gain, ...extra });
/** A held note, for chimes and fanfares. */
const note = (
  hz: number,
  delay: number,
  duration: number,
  gain: number,
  wave: OscillatorType = 'triangle',
) => o(wave, hz, hz, duration, gain, { delay, attack: 0.01, detune: 6 });

export const CUES: Record<SoundCue, Cue> = {
  // ------------------------------------------------------------------------------------------- weapons
  // A crackling javelin: a bright zap and a hiss of air.
  spear: {
    bus: 'weapon',
    gap: 70,
    voices: [
      o('sawtooth', 1400, 260, 0.11, 0.06, { drive: 0.3 }),
      n(5000, 1800, 0.09, 0.07, { filter: 'highpass' }),
    ],
  },
  // A bowstring twang and the arrow's hiss.
  bow: {
    bus: 'weapon',
    gap: 70,
    voices: [o('triangle', 520, 300, 0.09, 0.08, { detune: 12 }), n(3500, 6000, 0.08, 0.04)],
  },
  // Three prongs thrown hard: a deep whoosh and a metallic ring.
  trident: {
    bus: 'weapon',
    gap: 90,
    reverb: 0.15,
    voices: [
      n(500, 2500, 0.16, 0.08, { q: 2 }),
      o('triangle', 880, 860, 0.18, 0.025, { detune: 15, delay: 0.02 }),
    ],
  },
  // An orb of lightning humming past: a soft electric chirp.
  orb: {
    bus: 'weapon',
    gap: 220,
    voices: [o('sine', 900, 1500, 0.07, 0.03), n(7000, 4000, 0.05, 0.015, { filter: 'highpass' })],
  },
  // A war hammer: a heavy thump into the ground and a crack of stone.
  hammer: {
    bus: 'weapon',
    reverb: 0.25,
    voices: [
      o('sine', 140, 38, 0.32, 0.28),
      n(900, 150, 0.22, 0.12, { filter: 'lowpass', drive: 0.4 }),
      n(3000, 1200, 0.06, 0.05, { delay: 0.01 }),
    ],
  },
  // A flaming sword's arc: a swish and the roar of fire.
  sword: {
    bus: 'weapon',
    reverb: 0.1,
    voices: [
      n(1800, 4500, 0.16, 0.09, { q: 1.5 }),
      n(500, 250, 0.22, 0.05, { filter: 'lowpass', delay: 0.03 }),
    ],
  },
  // A thunderbolt: a sharp crack and rolling thunder.
  bolt: {
    bus: 'weapon',
    reverb: 0.35,
    voices: [
      n(8000, 2500, 0.06, 0.12, { filter: 'highpass' }),
      o('sawtooth', 1600, 120, 0.16, 0.06, { drive: 0.5 }),
      n(300, 60, 0.6, 0.12, { filter: 'lowpass', delay: 0.05 }),
    ],
  },
  // The soul scythe: a long hollow sweep with a ghostly moan.
  scythe: {
    bus: 'weapon',
    reverb: 0.4,
    voices: [n(800, 2200, 0.24, 0.08, { q: 3 }), o('sine', 240, 160, 0.3, 0.05, { detune: 25 })],
  },
  // Hades's bident: two dark prongs, a low growl and a hiss.
  bident: {
    bus: 'weapon',
    gap: 80,
    reverb: 0.2,
    voices: [
      o('sawtooth', 300, 110, 0.14, 0.05, { drive: 0.4, detune: 20 }),
      n(2000, 900, 0.1, 0.05),
    ],
  },
  // Athena's spear: a clean, ringing bronze throw.
  athenaSpear: {
    bus: 'weapon',
    gap: 70,
    voices: [
      n(2500, 5500, 0.08, 0.06, { q: 2 }),
      o('triangle', 1320, 1240, 0.14, 0.025, { detune: 8 }),
    ],
  },
  // Wrath of Olympus: lightning tears the sky open, then thunder rolls.
  strike: {
    bus: 'weapon',
    reverb: 0.5,
    vary: 0.02,
    voices: [
      n(9000, 3000, 0.1, 0.18, { filter: 'highpass' }),
      o('sawtooth', 2200, 90, 0.35, 0.09, { drive: 0.6 }),
      n(260, 40, 1.2, 0.2, { filter: 'lowpass', delay: 0.08 }),
    ],
  },
  // Gates of Tartarus: the ground opens with a deep, dark boom.
  tartarus: {
    bus: 'weapon',
    reverb: 0.5,
    vary: 0.02,
    voices: [
      o('sine', 90, 30, 0.9, 0.3),
      o('sawtooth', 70, 45, 0.8, 0.07, { drive: 0.6, detune: 30 }),
      n(700, 80, 0.9, 0.12, { filter: 'lowpass' }),
    ],
  },
  // Tidal Wave: a rushing surge of water that crashes.
  tidal: {
    bus: 'weapon',
    reverb: 0.4,
    vary: 0.02,
    voices: [
      n(300, 2200, 0.5, 0.14, { filter: 'lowpass', attack: 0.25 }),
      n(4000, 1200, 0.7, 0.08, { delay: 0.3 }),
      o('sine', 110, 55, 0.6, 0.12, { delay: 0.25 }),
    ],
  },
  // Gorgon's Gaze: a cold shimmer, then stone cracks.
  gaze: {
    bus: 'weapon',
    reverb: 0.45,
    vary: 0.02,
    voices: [
      o('sine', 1500, 3000, 0.4, 0.05, { detune: 40, attack: 0.1 }),
      n(2500, 600, 0.25, 0.12, { delay: 0.3, drive: 0.5 }),
      o('square', 180, 60, 0.2, 0.05, { delay: 0.3 }),
    ],
  },

  // Hecate's Torches (spec: seasonal-events): a soft roar of flame as they pass.
  torches: {
    bus: 'weapon',
    gap: 120,
    voices: [n(900, 2400, 0.16, 0.05, { filter: 'bandpass' }), o('sine', 180, 120, 0.12, 0.03)],
  },
  // Stars of Nyx: a faint, cold chime as they pass.
  stars: {
    bus: 'weapon',
    gap: 140,
    voices: [note(1760, 0, 0.18, 0.04, 'sine'), note(2637, 0.03, 0.14, 0.025, 'sine')],
  },
  // Breath of Boreas: a rising whoosh of wind.
  gust: {
    bus: 'weapon',
    gap: 90,
    voices: [
      n(400, 1800, 0.35, 0.12, { filter: 'bandpass', attack: 0.08 }),
      n(2500, 900, 0.3, 0.05, { delay: 0.1 }),
    ],
  },
  // Arrows of Eros: a bowstring plucked, then a bright little ring.
  heartstring: {
    bus: 'weapon',
    gap: 80,
    voices: [
      o('triangle', 320, 180, 0.12, 0.1),
      note(1320, 0.04, 0.2, 0.04, 'sine'),
      n(3000, 1500, 0.08, 0.05),
    ],
  },
  // Apple of Discord: a soft thud as an apple lands, and a crisp burst.
  apple: {
    bus: 'weapon',
    gap: 70,
    voices: [o('sine', 160, 70, 0.18, 0.18), n(1800, 500, 0.14, 0.09, { delay: 0.02 })],
  },
  // Pipes of Pan: a shrill run of reed notes.
  pipes: {
    bus: 'weapon',
    gap: 90,
    voices: [
      note(880, 0, 0.1, 0.05, 'square'),
      note(1175, 0.06, 0.1, 0.045, 'square'),
      note(1480, 0.12, 0.14, 0.04, 'square'),
      n(3000, 2000, 0.2, 0.03, { filter: 'bandpass' }),
    ],
  },
  // Moonbow of Artemis: a taut silver twang and the hiss of the arrow.
  moonbow: {
    bus: 'weapon',
    gap: 70,
    voices: [o('triangle', 520, 260, 0.1, 0.1), n(5000, 2500, 0.12, 0.05, { delay: 0.02 })],
  },
  // Rays of Apollo: a bright shimmering chord.
  sunray: {
    bus: 'weapon',
    gap: 90,
    voices: [
      note(1046, 0, 0.18, 0.035, 'sine'),
      note(1318, 0, 0.18, 0.03, 'sine'),
      note(1568, 0.02, 0.2, 0.03, 'sine'),
    ],
  },
  // Stolen Fire: a crackling leap of flame.
  stolenfire: {
    bus: 'weapon',
    gap: 90,
    voices: [
      n(1200, 3000, 0.18, 0.1, { filter: 'bandpass', drive: 0.4 }),
      o('sawtooth', 220, 110, 0.12, 0.04),
    ],
  },
  // ------------------------------------------------------------------------------------------- hits and kills
  hit: {
    bus: 'impact',
    gap: 45,
    voices: [n(1400, 400, 0.05, 0.07, { filter: 'lowpass' }), o('sine', 180, 90, 0.05, 0.05)],
  },
  hitLightning: {
    bus: 'impact',
    gap: 50,
    voices: [
      n(7000, 3000, 0.05, 0.05, { filter: 'highpass' }),
      o('square', 1800, 900, 0.03, 0.015),
    ],
  },
  hitFire: { bus: 'impact', gap: 50, voices: [n(2500, 1200, 0.08, 0.06, { q: 0.7 })] },
  hitShadow: {
    bus: 'impact',
    gap: 50,
    voices: [n(1200, 3000, 0.08, 0.05, { q: 4 }), o('sine', 220, 180, 0.06, 0.02)],
  },
  crit: {
    bus: 'impact',
    gap: 60,
    voices: [
      o('square', 1200, 600, 0.06, 0.04),
      n(4000, 1500, 0.06, 0.06),
      o('sine', 160, 70, 0.08, 0.06),
    ],
  },
  kill: {
    bus: 'impact',
    gap: 55,
    voices: [
      n(900, 200, 0.12, 0.08, { filter: 'lowpass', drive: 0.3 }),
      o('triangle', 240, 80, 0.1, 0.05),
    ],
  },
  shatter: {
    bus: 'impact',
    gap: 50,
    voices: [
      n(5000, 1800, 0.14, 0.09, { filter: 'bandpass' }),
      o('triangle', 900, 300, 0.06, 0.04),
    ],
  },
  killElite: {
    bus: 'impact',
    reverb: 0.3,
    voices: [
      o('sine', 120, 35, 0.5, 0.25),
      n(1200, 100, 0.5, 0.14, { filter: 'lowpass', drive: 0.5 }),
    ],
  },
  killBoss: {
    bus: 'impact',
    reverb: 0.6,
    vary: 0,
    voices: [
      o('sine', 90, 25, 1.6, 0.35),
      n(1500, 60, 1.6, 0.18, { filter: 'lowpass', drive: 0.6 }),
      o('sawtooth', 110, 40, 1.4, 0.06, { detune: 35 }),
    ],
  },

  // ------------------------------------------------------------------------------------------- the player
  // Your own wound: a low, gritty thud you cannot miss.
  hurt: {
    bus: 'player',
    gap: 120,
    voices: [
      o('sawtooth', 200, 70, 0.18, 0.1, { drive: 0.6 }),
      n(600, 150, 0.14, 0.12, { filter: 'lowpass' }),
    ],
  },
  revive: {
    bus: 'player',
    reverb: 0.5,
    vary: 0,
    voices: [
      note(523, 0, 0.25, 0.06, 'sine'),
      note(784, 0.12, 0.3, 0.06, 'sine'),
      note(1047, 0.24, 0.6, 0.07, 'sine'),
    ],
  },
  xp: {
    bus: 'player',
    gap: 40,
    voices: [o('sine', 1500, 2100, 0.05, 0.03), o('sine', 2250, 2600, 0.04, 0.012)],
  },
  gold: {
    bus: 'player',
    gap: 60,
    vary: 0.02,
    voices: [note(1976, 0, 0.05, 0.03, 'square'), note(2637, 0.045, 0.12, 0.03, 'square')],
  },
  heal: {
    bus: 'player',
    reverb: 0.3,
    voices: [o('sine', 440, 880, 0.35, 0.07, { detune: 10, attack: 0.05 })],
  },
  chest: {
    bus: 'player',
    reverb: 0.35,
    vary: 0,
    voices: [
      note(659, 0, 0.12, 0.07),
      note(880, 0.1, 0.12, 0.07),
      note(1319, 0.2, 0.4, 0.07),
      n(6000, 9000, 0.4, 0.02, { delay: 0.2, filter: 'highpass' }),
    ],
  },

  // ------------------------------------------------------------------------------------------- enemies and bosses
  enemyShot: {
    bus: 'enemy',
    gap: 120,
    voices: [o('triangle', 520, 300, 0.08, 0.03), n(2500, 1500, 0.06, 0.02)],
  },
  charge: {
    bus: 'enemy',
    gap: 200,
    voices: [
      o('sawtooth', 90, 180, 0.45, 0.05, { drive: 0.4 }),
      n(300, 900, 0.45, 0.04, { filter: 'lowpass' }),
    ],
  },
  // A boss gathers itself for a slam: a rising, ominous swell.
  telegraph: {
    bus: 'enemy',
    reverb: 0.3,
    voices: [
      o('sine', 140, 260, 0.6, 0.08, { attack: 0.3, detune: 20 }),
      n(200, 600, 0.6, 0.05, { filter: 'lowpass', attack: 0.3 }),
    ],
  },
  // Stones or whirlpools about to fall: a deep rumble.
  rumble: {
    bus: 'enemy',
    reverb: 0.3,
    voices: [
      n(200, 120, 0.9, 0.16, { filter: 'lowpass', attack: 0.2 }),
      o('sine', 55, 45, 0.9, 0.12, { attack: 0.2 }),
    ],
  },
  // A boss lowers its head to rush: a bellow.
  bellow: {
    bus: 'enemy',
    reverb: 0.35,
    voices: [
      o('sawtooth', 110, 80, 0.7, 0.1, { drive: 0.6, detune: 25, attack: 0.08 }),
      n(500, 250, 0.6, 0.06, { filter: 'lowpass' }),
    ],
  },
  // A boss calls its brood: a low horn.
  summon: {
    bus: 'enemy',
    reverb: 0.5,
    voices: [
      o('sawtooth', 98, 98, 0.9, 0.07, { attack: 0.15, detune: 12 }),
      o('sawtooth', 147, 147, 0.9, 0.05, { attack: 0.15, delay: 0.05 }),
    ],
  },
  impact: {
    bus: 'enemy',
    reverb: 0.35,
    voices: [
      o('sine', 100, 30, 0.45, 0.3),
      n(1500, 100, 0.4, 0.14, { filter: 'lowpass', drive: 0.5 }),
    ],
  },
  whoosh: { bus: 'enemy', voices: [n(400, 2400, 0.3, 0.12, { q: 1.5, attack: 0.06 })] },
  bossRoar: {
    bus: 'enemy',
    reverb: 0.6,
    vary: 0,
    voices: [
      o('sawtooth', 75, 45, 1.4, 0.16, { drive: 0.7, detune: 30, attack: 0.15 }),
      n(700, 150, 1.2, 0.1, { filter: 'lowpass', attack: 0.15 }),
      o('sine', 50, 35, 1.5, 0.2, { attack: 0.2 }),
    ],
  },

  // ------------------------------------------------------------------------------------------- interface and run
  levelUp: {
    bus: 'ui',
    reverb: 0.35,
    vary: 0,
    voices: [
      note(523, 0, 0.12, 0.08),
      note(659, 0.09, 0.12, 0.08),
      note(784, 0.18, 0.12, 0.08),
      note(1047, 0.27, 0.45, 0.09),
    ],
  },
  choose: {
    bus: 'ui',
    vary: 0,
    voices: [o('sine', 660, 990, 0.1, 0.06), note(1320, 0.06, 0.15, 0.03, 'sine')],
  },
  synergy: {
    bus: 'ui',
    reverb: 0.4,
    vary: 0,
    voices: [
      note(587, 0, 0.3, 0.06),
      note(880, 0.1, 0.3, 0.06),
      note(1175, 0.2, 0.6, 0.06, 'sine'),
    ],
  },
  // Call of Hermes: a rising rush of wind with a shimmer as the gems stream in.
  gather: {
    bus: 'ui',
    reverb: 0.5,
    vary: 0,
    voices: [
      n(600, 4200, 1.1, 0.05, { filter: 'bandpass' }),
      o('sine', 440, 1760, 1.0, 0.05),
      note(1319, 0.5, 0.5, 0.04, 'sine'),
      note(1760, 0.7, 0.7, 0.04, 'sine'),
    ],
  },
  // Apotheosis: a rising chord of brass-like saws over a low swell, then a long shimmer.
  apotheosis: {
    bus: 'ui',
    reverb: 0.7,
    vary: 0,
    voices: [
      o('sawtooth', 110, 220, 1.4, 0.05, { drive: 0.3 }),
      note(392, 0, 0.5, 0.07, 'sawtooth'),
      note(523, 0.2, 0.5, 0.07, 'sawtooth'),
      note(659, 0.4, 0.6, 0.07, 'sawtooth'),
      note(784, 0.6, 1.2, 0.08),
      note(1568, 0.8, 1.4, 0.035, 'sine'),
      n(3000, 9000, 1.6, 0.025, { delay: 0.7, filter: 'highpass' }),
    ],
  },
  elite: {
    bus: 'ui',
    reverb: 0.3,
    vary: 0,
    voices: [
      o('sawtooth', 110, 220, 0.5, 0.07, { drive: 0.4 }),
      o('sawtooth', 165, 330, 0.5, 0.04, { delay: 0.05 }),
    ],
  },
  // The gate opens: a rising shimmer over a deep chord.
  gate: {
    bus: 'ui',
    reverb: 0.6,
    vary: 0,
    voices: [
      note(196, 0, 1.4, 0.06, 'sawtooth'),
      note(294, 0.05, 1.4, 0.05),
      o('sine', 800, 2400, 1.2, 0.03, { attack: 0.4, detune: 30 }),
    ],
  },
  // A new realm: a low gust and a distant chord.
  realm: {
    bus: 'ui',
    reverb: 0.6,
    vary: 0,
    voices: [
      n(200, 900, 1.2, 0.08, { filter: 'lowpass', attack: 0.5 }),
      note(220, 0.4, 1.2, 0.05),
      note(330, 0.5, 1.2, 0.04),
    ],
  },
  victory: {
    bus: 'ui',
    reverb: 0.4,
    vary: 0,
    voices: [
      note(523, 0, 0.2, 0.1),
      note(659, 0.18, 0.2, 0.1),
      note(784, 0.36, 0.2, 0.1),
      note(1047, 0.54, 0.8, 0.11),
    ],
  },
  defeat: {
    bus: 'ui',
    reverb: 0.5,
    vary: 0,
    voices: [
      note(392, 0, 0.35, 0.09),
      note(311, 0.32, 0.35, 0.09),
      o('triangle', 262, 196, 1.2, 0.09, { delay: 0.64, detune: 10 }),
    ],
  },
  // A menu control: a soft lyre pluck with a faint high overtone.
  menuSelect: {
    bus: 'ui',
    vary: 0,
    voices: [note(880, 0, 0.14, 0.05), note(1760, 0, 0.08, 0.015, 'sine')],
  },
  // A screen's main action: two rising plucks, D then A, a little hall around them.
  menuConfirm: {
    bus: 'ui',
    reverb: 0.25,
    vary: 0,
    voices: [
      note(587, 0, 0.16, 0.06),
      note(880, 0.08, 0.3, 0.06),
      note(1760, 0.08, 0.15, 0.015, 'sine'),
    ],
  },
};

/** Most voices sounding at once per bus; the horde must not drown the player's own weapons. */
const BUS_VOICES: Record<Bus, number> = { weapon: 14, impact: 14, enemy: 10, player: 10, ui: 12 };
const BUS_GAIN: Record<Bus, number> = {
  weapon: 0.9,
  impact: 0.75,
  enemy: 0.85,
  player: 1,
  ui: 0.9,
};

/** Where a sound sits: its pan (−1 left … 1 right) and gain (0–1) from its position relative to the view. */
export function placement(
  x: number,
  y: number,
  listener: { readonly x: number; readonly y: number; readonly halfWidth: number },
): { pan: number; gain: number } {
  const half = Math.max(1, listener.halfWidth);
  const dx = x - listener.x;
  const pan = Math.max(-0.8, Math.min(0.8, (dx / half) * 0.8));
  // Full inside the view, fading out to silence two view-widths away.
  const beyond = Math.max(0, Math.hypot(dx, (y - listener.y) * 1.6) - half);
  const gain = Math.max(0, 1 - beyond / (half * 3));
  return { pan, gain };
}

export class SoundPlayer {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private reverb: GainNode | undefined;
  private readonly buses = new Map<Bus, GainNode>();
  private noise: AudioBuffer | undefined;
  /** Decoded recordings by manifest id. */
  private readonly samples = new Map<string, AudioBuffer>();
  private readonly curves = new Map<number, Float32Array<ArrayBuffer>>();
  private readonly lastPlayed = new Map<SoundCue, number>();
  private readonly voices = new Map<Bus, number>();
  private listener = { x: 0, y: 0, halfWidth: 0 };

  /** `resumeWhen`: whether sound is wanted now (the menus' player sleeps during runs). */
  constructor(
    private volume: number,
    resumeWhen: () => boolean = () => true,
  ) {
    try {
      const ctx = new AudioContext();
      this.context = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = volume;
      // A limiter: loud moments are pressed down instead of clipping.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 8;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      limiter.connect(this.master);
      this.master.connect(ctx.destination);
      // A small stone hall: a generated, decaying impulse.
      const convolver = ctx.createConvolver();
      convolver.buffer = this.impulse(ctx, 1.6);
      this.reverb = ctx.createGain();
      this.reverb.gain.value = 0.5;
      this.reverb.connect(convolver);
      convolver.connect(limiter);
      for (const bus of Object.keys(BUS_VOICES) as Bus[]) {
        const gain = ctx.createGain();
        gain.gain.value = BUS_GAIN[bus];
        gain.connect(limiter);
        this.buses.set(bus, gain);
      }
      if (resumeWhen()) void ctx.resume().catch(() => undefined);
      // Browsers keep audio suspended until a key press, click or touch they count (e.g. an intro on first launch);
      // phones count a touch's end, not its start (spec: phone-play / the phone screen).
      unlockOnGesture(ctx, resumeWhen);
    } catch {
      // No audio available (old browser or tests): stay silent.
      this.context = undefined;
    }
  }

  /** The audio context, shared with the music (spec: music); undefined without audio. */
  get audioContext(): AudioContext | undefined {
    return this.context;
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  /** The view sounds are heard from (the camera's centre and half its width, in world units). */
  setListener(x: number, y: number, halfWidth: number): void {
    this.listener = { x, y, halfWidth };
  }

  /**
   * Fetches and decodes the recordings the cues use (`files`: manifest id → URL). Until a cue's recordings are in,
   * it plays its synthesized voices; a file that fails to load leaves that cue synthesized.
   */
  load(files: Readonly<Record<string, string>>): void {
    const ctx = this.context;
    if (!ctx) return;
    for (const [id, url] of Object.entries(files)) {
      void fetch(url)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(url))))
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => this.samples.set(id, buffer))
        .catch(() => undefined);
    }
  }

  /** Plays `cue`; with `at`, a world position, it is panned and faded by where that is relative to the view. */
  play(cue: SoundCue, at?: { readonly x: number; readonly y: number }): void {
    const ctx = this.context;
    if (!ctx || !this.master || this.volume <= 0 || ctx.state !== 'running') return;
    const def = CUES[cue];
    if ((this.voices.get(def.bus) ?? 0) >= BUS_VOICES[def.bus]) return;
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(cue) ?? -1) < (def.gap ?? 30) / 1000) return;
    const place =
      at && this.listener.halfWidth > 0 ? placement(at.x, at.y, this.listener) : undefined;
    if (place && place.gain < 0.03) return;
    this.lastPlayed.set(cue, now);

    // One chain per play: the voices → gain (placement) → pan → its bus, and a send to the reverb.
    const out = ctx.createGain();
    out.gain.value = place?.gain ?? 1;
    const pan = ctx.createStereoPanner();
    pan.pan.value = place?.pan ?? 0;
    out.connect(pan);
    pan.connect(this.buses.get(def.bus) as GainNode);
    let send: GainNode | undefined;
    if (def.reverb && this.reverb) {
      send = ctx.createGain();
      send.gain.value = def.reverb;
      out.connect(send);
      send.connect(this.reverb);
    }
    // Cosmetic variation only; not gameplay randomness (D5).
    const pitch = 1 + (Math.random() * 2 - 1) * (def.vary ?? 0.04);
    let longest = 0;
    const layers = RECORDED[cue];
    const picks = layers?.map((layer) => this.pick(layer));
    if (layers && picks?.every((b) => b)) {
      layers.forEach((layer, i) => {
        const buffer = picks[i] as AudioBuffer;
        const rate = (layer.rate ?? 1) * pitch;
        this.sample(ctx, out, buffer, layer, now + (layer.delay ?? 0), rate, def.bus);
        longest = Math.max(longest, (layer.delay ?? 0) + buffer.duration / rate);
      });
    } else {
      for (const v of def.voices) {
        const start = now + (v.delay ?? 0);
        this.voice(ctx, out, v, start, pitch, def.bus);
        longest = Math.max(longest, (v.delay ?? 0) + v.duration);
      }
    }
    // Free the chain once its tail (and the reverb's) has rung out.
    setTimeout(
      () => {
        out.disconnect();
        pan.disconnect();
        send?.disconnect();
      },
      (longest + 0.2) * 1000,
    );
  }

  destroy(): void {
    void this.context?.close().catch(() => undefined);
    this.context = undefined;
  }

  /** One loaded recording of the layer (a random variant, cosmetic), or undefined while none has loaded. */
  private pick(layer: SampleLayer): AudioBuffer | undefined {
    const ids = typeof layer.id === 'string' ? [layer.id] : layer.id;
    const loaded = ids.filter((id) => this.samples.has(id));
    return loaded.length
      ? this.samples.get(loaded[Math.floor(Math.random() * loaded.length)])
      : undefined;
  }

  private sample(
    ctx: AudioContext,
    out: AudioNode,
    buffer: AudioBuffer,
    layer: SampleLayer,
    start: number,
    rate: number,
    bus: Bus,
  ): void {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = layer.gain;
    source.connect(gain);
    gain.connect(out);
    this.voices.set(bus, (this.voices.get(bus) ?? 0) + 1);
    source.onended = () => {
      this.voices.set(bus, (this.voices.get(bus) ?? 1) - 1);
      gain.disconnect();
    };
    source.start(start);
  }

  private voice(
    ctx: AudioContext,
    out: AudioNode,
    v: Voice,
    start: number,
    pitch: number,
    bus: Bus,
  ): void {
    const end = start + v.duration;
    const attack = Math.min(v.attack ?? 0.006, v.duration * 0.5);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(v.gain, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    let tail: AudioNode = env;
    if (v.drive) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.curve(v.drive);
      env.connect(shaper);
      tail = shaper;
    }
    tail.connect(out);

    const sources: AudioScheduledSourceNode[] = [];
    if (v.wave === 'noise') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer(ctx);
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = v.filter ?? 'bandpass';
      filter.Q.value = v.q ?? 1;
      filter.frequency.setValueAtTime(v.from * pitch, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, v.to * pitch), end);
      noise.connect(filter);
      filter.connect(env);
      sources.push(noise);
    } else {
      for (const cents of v.detune ? [-v.detune / 2, v.detune / 2] : [0]) {
        const osc = ctx.createOscillator();
        osc.type = v.wave;
        osc.detune.value = cents;
        osc.frequency.setValueAtTime(v.from * pitch, start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.to * pitch), end);
        osc.connect(env);
        sources.push(osc);
      }
    }
    this.voices.set(bus, (this.voices.get(bus) ?? 0) + 1);
    let left = sources.length;
    for (const source of sources) {
      source.onended = () => {
        if (--left === 0) {
          this.voices.set(bus, (this.voices.get(bus) ?? 1) - 1);
          env.disconnect();
          if (tail !== env) tail.disconnect();
        }
      };
      source.start(start);
      source.stop(end + 0.02);
    }
  }

  /** A soft-clipping curve; `drive` 0–1. */
  private curve(drive: number): Float32Array<ArrayBuffer> {
    const key = Math.round(drive * 20);
    let curve = this.curves.get(key);
    if (!curve) {
      const k = 1 + key * 2;
      curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      this.curves.set(key, curve);
    }
    return curve;
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      // Cosmetic noise only; not gameplay randomness.
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  /** A stereo room impulse: noise decaying over `seconds`, a little different on each side. */
  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    return buffer;
  }
}
