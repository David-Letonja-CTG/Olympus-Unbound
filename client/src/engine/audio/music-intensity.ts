/** What the music listens to (spec: music / what drives the music). */
export interface MusicSituation {
  /** Seconds in the current realm, and when its boss arrives. */
  readonly realmTime: number;
  readonly bossAt: number;
  /** Realms cleared. */
  readonly depth: number;
  /** Foes around the player's own god. */
  readonly enemiesNear: number;
  readonly bossAwake: boolean;
}

/** Foes within this distance of the player's god count as near. */
export const NEAR = 420;

/** Calm, Stirring, Battle, Fury, Titan. */
export type MusicTier = 0 | 1 | 2 | 3 | 4;
export const TIER_NAMES = ['Calm', 'Stirring', 'Battle', 'Fury', 'Titan'] as const;

/** Lower edges of Stirring, Battle, Fury and Titan. */
const THRESHOLDS = [0.2, 0.4, 0.62, 0.95] as const;
/** A tier is left downward only this far below its edge, so the music does not flicker. */
const HYSTERESIS = 0.06;
/** Seconds to follow a rise, and a fall, of the intensity. */
const RISE = 1;
const FALL = 8;

/**
 * 0–1: the realm's time toward its boss, every realm cleared and the crowd around the player's god; 1 while a boss is
 * awake.
 */
export function musicIntensity(s: MusicSituation): number {
  if (s.bossAwake) return 1;
  const progress = 0.55 * Math.min(1, Math.max(0, s.realmTime / Math.max(1, s.bossAt)));
  const realms = Math.min(0.45, 0.15 * s.depth);
  const crowd = Math.min(0.3, (s.enemiesNear / 40) * 0.3);
  // Below Titan without a boss: Titan is the boss's own tier.
  return Math.min(THRESHOLDS[3] - 0.01, progress + realms + crowd);
}

function tierOf(level: number): MusicTier {
  let tier = 0;
  for (const edge of THRESHOLDS) if (level >= edge) tier++;
  return tier as MusicTier;
}

/** Smooths the intensity (quick to rise, slow to fall) and holds tiers with a little hysteresis. */
export class TierTracker {
  private level = 0;
  private current: MusicTier = 0;

  /** Feeds the intensity now, `dt` seconds after the last; returns the tier to play. */
  update(intensity: number, dt: number): MusicTier {
    const rate = intensity > this.level ? RISE : FALL;
    this.level += (intensity - this.level) * Math.min(1, dt / rate);
    // A boss wakes: straight to Titan.
    if (intensity >= 1) this.level = Math.max(this.level, THRESHOLDS[3]);
    const target = tierOf(this.level);
    if (target > this.current) this.current = target;
    else if (target < this.current) {
      const edge = THRESHOLDS[this.current - 1];
      if (this.level < edge - HYSTERESIS) this.current = tierOf(this.level + HYSTERESIS);
    }
    return this.current;
  }

  get tier(): MusicTier {
    return this.current;
  }
}
