import { MusicTier } from './music-intensity';

/** The instruments the music player synthesizes (spec: music / battle music). */
export type MusicPart =
  | 'kick'
  | 'snare'
  | 'hat'
  | 'crash'
  | 'frame'
  | 'tom'
  | 'bass'
  | 'guitar'
  | 'mute'
  | 'lyre'
  | 'choir';

/** One note of a bar: when (in beats from the bar's start), how long, which MIDI pitch, how hard (0–1). */
export interface MusicNote {
  readonly part: MusicPart;
  readonly beat: number;
  readonly length: number;
  readonly pitch: number;
  readonly velocity: number;
}

export interface TierStyle {
  readonly name: string;
  /** Beats per minute; every bar is four beats. */
  readonly bpm: number;
}

export const TIERS: readonly TierStyle[] = [
  { name: 'Calm', bpm: 88 },
  { name: 'Stirring', bpm: 100 },
  { name: 'Battle', bpm: 120 },
  { name: 'Fury', bpm: 140 },
  { name: 'Titan', bpm: 160 },
];

/**
 * The four-bar progression in D minor with a Greek colour (the dominant A major): D minor, B♭, C, A. Each chord: the
 * bass root (MIDI, around the second octave) and the chord's third and fifth as semitones above it.
 */
const PROGRESSION: readonly { readonly root: number; readonly third: number }[] = [
  { root: 38, third: 3 }, // D minor
  { root: 34, third: 4 }, // B flat
  { root: 36, third: 4 }, // C
  { root: 33, third: 4 }, // A (major: the raised third)
];

/** The notes of bar `bar` at `tier`. Pure: the same bar always sounds the same (testable without audio). */
export function barNotes(tier: MusicTier, bar: number): MusicNote[] {
  const chord = PROGRESSION[((bar % 4) + 4) % 4];
  const last = bar % 4 === 3;
  const notes: MusicNote[] = [];
  const add = (part: MusicPart, beat: number, length: number, pitch: number, velocity: number) =>
    notes.push({ part, beat, length, pitch, velocity });
  const root = chord.root;
  const third = root + chord.third;
  const fifth = root + 7;

  switch (tier) {
    case 0: {
      // Calm: a lyre walking the chord in eighths over a soft frame drum.
      const arp = [0, 7, 12, chord.third + 12, 19, 12, 7, chord.third + 12];
      arp.forEach((step, i) =>
        add('lyre', i * 0.5, 0.9, root + 24 + step, i % 4 === 0 ? 0.55 : 0.4),
      );
      add('frame', 0, 1, 0, 0.5);
      add('frame', 2, 1, 0, 0.35);
      if (last) add('frame', 3.5, 0.5, 0, 0.3);
      break;
    }
    case 1: {
      // Stirring: war drums, a bass on the half notes, the lyre on quarters, a low choir.
      for (const [beat, v] of [
        [0, 0.7],
        [1.5, 0.45],
        [2, 0.6],
        [3, 0.45],
      ] as const)
        add('frame', beat, 0.5, 0, v);
      add('tom', 3.5, 0.5, 0, 0.5);
      if (last) add('tom', 3.75, 0.25, 1, 0.55);
      add('bass', 0, 1.9, root, 0.6);
      add('bass', 2, 1.9, root, 0.5);
      [0, 7, 12, chord.third + 12].forEach((step, i) =>
        add('lyre', i, 0.9, root + 24 + step, 0.35),
      );
      add('choir', 0, 4, root + 12, 0.25);
      break;
    }
    case 2: {
      // Battle: a rock beat, bass in eighths, power chords on the half notes.
      add('kick', 0, 0.5, 0, 0.9);
      add('kick', 2, 0.5, 0, 0.85);
      add('kick', 2.5, 0.5, 0, 0.6);
      add('snare', 1, 0.5, 0, 0.8);
      add('snare', 3, 0.5, 0, 0.8);
      for (let i = 0; i < 8; i++) add('hat', i * 0.5, 0.25, 0, i % 2 === 0 ? 0.5 : 0.3);
      for (let i = 0; i < 8; i++) add('bass', i * 0.5, 0.45, root, i % 2 === 0 ? 0.7 : 0.55);
      add('guitar', 0, 1.9, root + 12, 0.7);
      add('guitar', 2, 1.9, root + 12, 0.65);
      add('choir', 0, 4, third + 12, 0.15);
      if (last) {
        add('tom', 3.5, 0.25, 0, 0.6);
        add('tom', 3.75, 0.25, 1, 0.6);
      }
      if (bar % 8 === 0) add('crash', 0, 2, 0, 0.5);
      break;
    }
    case 3: {
      // Fury: galloping double kick, palm-muted chugs and power-chord accents.
      for (let i = 0; i < 16; i++) {
        const gallop = i % 4 !== 1;
        if (gallop) add('kick', i * 0.25, 0.25, 0, i % 4 === 0 ? 0.95 : 0.7);
      }
      add('snare', 1, 0.5, 0, 0.9);
      add('snare', 3, 0.5, 0, 0.9);
      for (let i = 0; i < 8; i++) add('hat', i * 0.5, 0.25, 0, 0.45);
      for (let i = 0; i < 8; i++) {
        const accent = i === 0 || i === 3 || i === 6;
        if (accent) add('guitar', i * 0.5, 0.45, root + 12, 0.8);
        else add('mute', i * 0.5, 0.25, root + 12, 0.7);
        add('bass', i * 0.5, 0.4, root, 0.7);
      }
      add('choir', 0, 4, fifth + 12, 0.2);
      if (bar % 4 === 0) add('crash', 0, 2, 0, 0.6);
      break;
    }
    case 4: {
      // Titan: constant double kick, sixteenth chugs, chord stabs, the full choir.
      for (let i = 0; i < 16; i++) add('kick', i * 0.25, 0.25, 0, i % 4 === 0 ? 1 : 0.75);
      add('snare', 1, 0.5, 0, 1);
      add('snare', 3, 0.5, 0, 1);
      for (let i = 0; i < 8; i++) add('hat', i * 0.5 + 0.25, 0.25, 0, 0.4);
      for (let i = 0; i < 16; i++) {
        const stab = i === 0 || i === 6 || i === 12;
        if (stab) add('guitar', i * 0.25, 0.7, root + 12, 0.9);
        else if (i % 2 === 0 || i > 12) add('mute', i * 0.25, 0.2, root + 12, 0.75);
      }
      for (let i = 0; i < 8; i++) add('bass', i * 0.5, 0.45, root, 0.8);
      add('choir', 0, 4, root + 12, 0.35);
      add('choir', 0, 4, third + 12, 0.3);
      if (last) for (let i = 0; i < 4; i++) add('tom', 3 + i * 0.25, 0.25, 1 - i * 0.3, 0.8);
      if (bar % 2 === 0) add('crash', 0, 2, 0, 0.7);
      break;
    }
  }
  return notes;
}

/** Seconds per beat at a tier. */
export function beatSeconds(tier: MusicTier): number {
  return 60 / TIERS[tier].bpm;
}
