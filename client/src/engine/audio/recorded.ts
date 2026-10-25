import type { AssetFile } from '../data/assets';
import type { SoundCue } from './sound-player';

/**
 * A layer of recorded sound in a cue: one of `id` (a sound file's manifest id; one picked at random when several),
 * at `gain`, after `delay` seconds, played at `rate` (below 1: deeper and slower).
 */
export interface SampleLayer {
  readonly id: string | readonly string[];
  readonly gain: number;
  readonly delay?: number;
  readonly rate?: number;
}

const v = (name: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${name}_${String(i).padStart(3, '0')}`);
const PUNCH = v('impactPunch_medium', 5);
const PUNCH_HEAVY = v('impactPunch_heavy', 5);
const SOFT_HEAVY = v('impactSoft_heavy', 3);
const SOFT = v('impactSoft_medium', 3);
const STONE = v('impactMining', 5);
const METAL = v('impactMetal_light', 3);
const PLATE = v('impactPlate_heavy', 3);
const BELL = v('impactBell_heavy', 2);
const SLICE = ['knifeSlice', 'knifeSlice2'];
const COINS = ['handleCoins', 'handleCoins2'];

/**
 * The recordings each cue is made of (spec: hud / sound feedback), so a skill sounds like what it is: Zeus's Wrath
 * is a real thunderstorm, Poseidon's wave real water, Athena's gaze ice and cracking stone, a hammer real impacts.
 * Cues not listed here, or whose files have not loaded, use their synthesized voices.
 */
export const RECORDED: Partial<Record<SoundCue, readonly SampleLayer[]>> = {
  // Zeus.
  spear: [
    { id: 'lightning_spark', gain: 0.45, rate: 1.15 },
    { id: SLICE, gain: 0.3, rate: 1.3 },
  ],
  bolt: [
    { id: 'lightning_bolt', gain: 0.65 },
    { id: 'thunder_clap', gain: 0.75, delay: 0.06 },
  ],
  strike: [
    { id: 'lightning_crack', gain: 0.8 },
    { id: 'thunder_roll', gain: 1, delay: 0.05 },
  ],
  orb: [{ id: 'lightning_spark', gain: 0.18, rate: 1.6 }],
  // Poseidon.
  trident: [
    { id: 'water_splash', gain: 0.5, rate: 1.1 },
    { id: METAL, gain: 0.3 },
  ],
  tidal: [
    { id: 'water_surge', gain: 0.85 },
    { id: 'water_crash', gain: 0.9, delay: 0.35, rate: 0.9 },
  ],
  // Athena.
  athenaSpear: [
    { id: SLICE, gain: 0.45, rate: 1.15 },
    { id: METAL, gain: 0.3 },
  ],
  gaze: [
    { id: 'ice_shimmer', gain: 0.7 },
    { id: 'ice_crack', gain: 0.75, delay: 0.45 },
    { id: STONE, gain: 0.55, delay: 0.45, rate: 0.8 },
  ],
  // Hades.
  bident: [
    { id: 'chop', gain: 0.5, rate: 0.8 },
    { id: 'fire_spark', gain: 0.35, rate: 0.6 },
  ],
  tartarus: [
    { id: 'fire_roar', gain: 0.9, rate: 0.55 },
    { id: STONE, gain: 0.6, rate: 0.6 },
    { id: PUNCH_HEAVY, gain: 0.6, rate: 0.5 },
  ],
  // The other weapons.
  hammer: [
    { id: PUNCH_HEAVY, gain: 0.85 },
    { id: STONE, gain: 0.6 },
  ],
  sword: [
    { id: SLICE, gain: 0.45 },
    { id: 'fire_burst', gain: 0.45, rate: 1.2 },
  ],
  bow: [{ id: SLICE, gain: 0.3, rate: 1.6 }],
  scythe: [
    { id: SLICE, gain: 0.5, rate: 0.7 },
    { id: 'ice_shimmer', gain: 0.2, rate: 0.6 },
  ],
  // Hits and kills.
  hit: [{ id: PUNCH, gain: 0.32 }],
  hitLightning: [{ id: 'lightning_spark', gain: 0.22, rate: 1.4 }],
  hitFire: [{ id: 'fire_spark', gain: 0.3 }],
  hitShadow: [{ id: SOFT, gain: 0.35, rate: 0.8 }],
  crit: [{ id: PLATE, gain: 0.45 }],
  kill: [{ id: SOFT_HEAVY, gain: 0.4 }],
  shatter: [
    { id: STONE, gain: 0.45, rate: 1.6 },
    { id: SOFT, gain: 0.3, rate: 1.3 },
  ],
  killElite: [
    { id: PUNCH_HEAVY, gain: 0.85, rate: 0.8 },
    { id: STONE, gain: 0.5 },
  ],
  killBoss: [
    { id: 'thunder_clap', gain: 0.9, rate: 0.8 },
    { id: BELL, gain: 0.5, rate: 0.6 },
    { id: PUNCH_HEAVY, gain: 0.8, rate: 0.5 },
  ],
  // The player.
  hurt: [{ id: PUNCH_HEAVY, gain: 0.7, rate: 0.85 }],
  gold: [{ id: COINS, gain: 0.35, rate: 1.2 }],
  chest: [
    { id: 'metalLatch', gain: 0.5 },
    { id: COINS, gain: 0.45, delay: 0.1 },
  ],
  // Bosses.
  impact: [
    { id: STONE, gain: 0.7, rate: 0.7 },
    { id: PUNCH_HEAVY, gain: 0.7, rate: 0.6 },
  ],
  rumble: [{ id: 'thunder_clap', gain: 0.55, rate: 0.5 }],
  gate: [{ id: BELL, gain: 0.5, rate: 0.7 }],
};

/** Every sound file the cues use. */
export function recordedIds(): string[] {
  const ids = new Set<string>();
  for (const layers of Object.values(RECORDED))
    for (const layer of layers ?? [])
      for (const id of typeof layer.id === 'string' ? [layer.id] : layer.id) ids.add(id);
  return [...ids];
}

/** The sound files in an asset manifest, by id (for `SoundPlayer.load`). */
export function soundFiles(files: readonly AssetFile[]): Record<string, string> {
  return Object.fromEntries(files.filter((f) => f.type === 'sound').map((f) => [f.id, f.url]));
}
