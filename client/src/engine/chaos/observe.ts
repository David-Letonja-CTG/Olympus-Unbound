import { Element, ELEMENTS } from '../data/types';
import { RunState } from '../sim/run-state';

/** The named parts of the pressure, each 0–1 (spec: director-of-chaos / observing the run). */
export interface PressureFactors {
  /** Weighted threats near living gods against `threatScale`. */
  readonly threat: number;
  /** Recent damage per second against the party's maximum health and `damageScale`. */
  readonly damage: number;
  /** Health the party is missing (fallen gods count as empty). */
  readonly health: number;
  /** The boss is awake. */
  readonly boss: number;
  /** Encounters under way: 1 for an active major one, 0.4 for anything else, 0 for none. */
  readonly encounters: number;
}

/** What the Director saw at its last look; read-only facts about the run. */
export interface Observation {
  readonly pressure: number;
  readonly factors: PressureFactors;
  /** Kills per second over the kill window. */
  readonly killRate: number;
  /** The party's health share, 0–1. */
  readonly health: number;
  /** Every living god has stayed within a small radius for a while. */
  readonly still: boolean;
}

export const CALM: Observation = {
  pressure: 0,
  factors: { threat: 0, damage: 0, health: 0, boss: 0, encounters: 0 },
  killRate: 0,
  health: 1,
  still: false,
};

/** Threat weights: a monster 1, an elite or champion 5, the boss 12, a warned hazard 3, a hostile missile 0.5. */
const THREAT = { monster: 1, elite: 5, boss: 12, hazard: 3, missile: 0.5 } as const;

/**
 * Watches the run for the Director (spec: director-of-chaos / observing the run). It keeps only its own memory (recent
 * damage, kills over a window, where each god stood) and never writes to the run: the same run is played whether or
 * not anyone looks.
 */
export class Observer {
  private lastDamage = 0;
  private damageRate = 0;
  /** Kill counts at each look, as a ring over the kill window. */
  private readonly kills: { time: number; kills: number }[] = [];
  private killAt = 0;
  /** Where each god was when it last moved far, and since when it has stayed near there. */
  private readonly anchors = new Map<number, { x: number; y: number; since: number }>();

  constructor(private readonly state: RunState) {
    this.lastDamage = state.damageTaken;
  }

  /** Looks at the run `dt` seconds after the last look; `encounters` is the Director's own factor. */
  observe(dt: number, encounters: number): Observation {
    const state = this.state;
    const rules = state.balance.director;
    const p = rules.pressure;

    // Health and recent damage, over the gods still in the run.
    let health = 0;
    let max = 0;
    for (const pl of state.players) {
      if (pl.left) continue;
      max += pl.stats.maxHealth;
      if (pl.alive) health += Math.max(0, pl.health);
    }
    const share = max > 0 ? health / max : 0;
    const lost = state.damageTaken - this.lastDamage;
    this.lastDamage = state.damageTaken;
    const rate = dt > 0 && max > 0 ? lost / dt / max : 0;
    const keep = Math.pow(0.5, dt / p.damageHalfLife);
    this.damageRate = this.damageRate * keep + rate * (1 - keep);

    const factors: PressureFactors = {
      threat: Math.min(1, this.threat() / p.threatScale),
      damage: Math.min(1, this.damageRate / p.damageScale),
      health: 1 - share,
      boss: state.boss && !state.boss.dead ? 1 : 0,
      encounters,
    };
    const w = p.weights;
    const pressure = Math.min(
      1,
      factors.threat * w.threat +
        factors.damage * w.damage +
        factors.health * w.health +
        factors.boss * w.boss +
        factors.encounters * w.encounters,
    );
    return {
      pressure,
      factors,
      killRate: this.killRate(),
      health: share,
      still: this.stillness(),
    };
  }

  /** Weighted threats within reach of any living god: one pass over monsters, hazards and missiles. */
  private threat(): number {
    const state = this.state;
    const r2 = state.balance.director.pressure.radius ** 2;
    const near = (x: number, y: number) => {
      for (const pl of state.players)
        if (pl.alive && (pl.x - x) ** 2 + (pl.y - y) ** 2 <= r2) return true;
      return false;
    };
    let sum = 0;
    for (const e of state.enemies) {
      // A boss's parts count as the boss.
      if (e.dead || e.part || !near(e.x, e.y)) continue;
      sum += e.boss ? THREAT.boss : e.elite || e.champion ? THREAT.elite : THREAT.monster;
    }
    for (const h of state.hazards) if (!h.dead && near(h.x, h.y)) sum += THREAT.hazard;
    for (const h of state.hostileProjectiles) if (!h.dead && near(h.x, h.y)) sum += THREAT.missile;
    return sum;
  }

  /** Kills per second over the kill window (shorter at the start of a run). */
  private killRate(): number {
    const state = this.state;
    const window = state.balance.director.adapt.killWindow;
    const size = Math.max(2, Math.ceil(window / state.balance.director.observe) + 1);
    const sample = { time: state.time, kills: state.kills };
    if (this.kills.length < size) this.kills.push(sample);
    else this.kills[this.killAt] = sample;
    this.killAt = (this.killAt + 1) % size;
    // The oldest sample is the next to be overwritten once the ring is full.
    const oldest = this.kills.length < size ? this.kills[0] : this.kills[this.killAt];
    const span = state.time - oldest.time;
    return span > 0 ? (state.kills - oldest.kills) / span : 0;
  }

  /** Every living god has stayed within `stillRadius` of one place for `stillSeconds`. */
  private stillness(): boolean {
    const state = this.state;
    const { stillRadius, stillSeconds } = state.balance.director.adapt;
    let living = 0;
    let still = true;
    for (const pl of state.players) {
      if (!pl.alive) {
        this.anchors.delete(pl.id);
        continue;
      }
      living++;
      const anchor = this.anchors.get(pl.id);
      if (!anchor || (pl.x - anchor.x) ** 2 + (pl.y - anchor.y) ** 2 > stillRadius ** 2) {
        this.anchors.set(pl.id, { x: pl.x, y: pl.y, since: state.time });
        still = false;
      } else if (state.time - anchor.since < stillSeconds) still = false;
    }
    return living > 0 && still;
  }

  /** The party starts afresh in a new realm: nobody has been standing anywhere yet. */
  reset(): void {
    this.anchors.clear();
  }
}

/**
 * The element that has dealt the party's most damage so far, else the first god's first affinity: a hunter's title
 * answers it (spec: director-of-chaos / roaming elite). Only words; no numbers change.
 */
export function dominantElement(state: RunState): Element {
  const dealt: Record<Element, number> = { lightning: 0, fire: 0, physical: 0, shadow: 0 };
  for (const pl of state.players)
    for (const w of pl.loadout.weapons) dealt[w.def.element] += w.damageDealt;
  let best: Element = state.god.affinities[0] ?? 'physical';
  let most = 0;
  for (const element of ELEMENTS)
    if (dealt[element] > most) {
      most = dealt[element];
      best = element;
    }
  return best;
}
