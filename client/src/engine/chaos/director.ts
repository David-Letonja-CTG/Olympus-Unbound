import { heal } from '../combat/damage';
import { EncounterDefinition, EncounterReward, EncounterTag } from '../data/types';
import { RunState } from '../sim/run-state';
import { EncounterPhase, HudEncounter, SiteKind } from '../sim/types';
import { SpawnDirector } from '../spawning/director';
import { describeReward, goldOf, mergeRewards, ruleOf } from './behaviors';
import { grantBoon, updateBoons } from './boons';
import { Encounter, EncounterContext } from './encounter';
import { CALM, Observation, Observer, PressureFactors } from './observe';

/** The run's realm state (spec: director-of-chaos / realm state). */
export interface RealmState {
  corruption: number;
  grudge: number;
}

/** Where the run's tension stands, for the report: quiet, rising, at a peak, or given room to recover. */
export type Mood = 'calm' | 'building' | 'peak' | 'recovery';

/** One choice the Director made, and why. */
export interface Decision {
  readonly time: number;
  readonly id: string;
  readonly pressure: number;
  /** Encounters it chose among. */
  readonly candidates: number;
  /** Adaptive rules and novelty that changed its weight, e.g. "struggling ×2.5". */
  readonly because: readonly string[];
}

/** How an encounter ended. */
export interface OutcomeRecord {
  readonly time: number;
  readonly id: string;
  readonly phase: EncounterPhase;
  readonly outcome?: string;
  readonly realm: string;
}

/** Everything the Director knows, for debugging (spec: director-of-chaos / debugging); built only when asked. */
export interface DirectorReport {
  readonly enabled: boolean;
  /** The stream its choices come from. */
  readonly stream: string;
  readonly pressure: number;
  readonly factors: PressureFactors;
  readonly mood: Mood;
  readonly recoveryLeft: number;
  readonly killRate: number;
  readonly still: boolean;
  readonly struggling: boolean;
  readonly dominant: boolean;
  /** Seconds until an adaptive rule may apply again. */
  readonly adaptIn: number;
  readonly realm: {
    readonly corruption: number;
    readonly grudge: number;
    readonly elitesSlain: number;
  };
  readonly active: readonly {
    readonly uid: number;
    readonly id: string;
    readonly phase: EncounterPhase;
    readonly seconds: number;
    readonly outcome?: string;
    /** Where it happens (its marker, hunter or rift). */
    readonly x: number;
    readonly y: number;
  }[];
  readonly encounters: readonly {
    readonly id: string;
    /** Why it cannot start now; absent when it could. */
    readonly reason?: string;
    readonly cooldown: number;
    readonly thisRealm: number;
  }[];
  readonly decisions: readonly Decision[];
  readonly outcomes: readonly OutcomeRecord[];
}

/** The transitions an encounter may make (spec: director-of-chaos / encounter lifecycle); anything else is refused. */
const NEXT: Readonly<Record<EncounterPhase, readonly EncounterPhase[]>> = {
  telegraph: ['active', 'cancelled'],
  active: ['resolving', 'cancelled'],
  resolving: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

/**
 * The Director of Chaos (spec: director-of-chaos): a game master in the simulation. It observes the run, keeps a
 * pressure model, decides when an encounter may start and which, runs every encounter through one lifecycle, applies
 * endings exactly once, and remembers their consequences in the realm state. Deterministic (D5): its choices and places
 * come from the `chaos` stream and simulation time only. In a room only the host's simulation has one (D16).
 */
export class ChaosDirector implements EncounterContext {
  readonly realm: RealmState = { corruption: 0, grudge: 0 };
  /** Whether it starts encounters on its own (off for debugging or by the run's rules). */
  enabled: boolean;
  spawner!: SpawnDirector;

  private readonly observer: Observer;
  private seen: Observation = CALM;
  private readonly encounters: Encounter[] = [];
  /** Run time each encounter may start again, by id. */
  private readonly readyAt = new Map<string, number>();
  private readonly thisRealm = new Map<string, number>();
  private observeTimer = 0;
  private thinkTimer = 0;
  private lastStart = -Infinity;
  private lastEnd = -Infinity;
  private lastMajorEnd = -Infinity;
  private highFor = 0;
  private recoveryUntil = -Infinity;
  private lastAdapt = -Infinity;
  private lastChosen: string | undefined;
  private nextUid = 1;
  private nextSite = 1;
  /** The realm's boss has been seen awake. */
  private bossSeen = false;
  private readonly decisions: Decision[] = [];
  private readonly outcomes: OutcomeRecord[] = [];

  constructor(readonly state: RunState) {
    this.enabled = state.config.rules?.director !== false;
    this.observer = new Observer(state);
  }

  get rng() {
    return this.state.chaosRng;
  }

  get observation(): Observation {
    return this.seen;
  }

  /** The party struggles: a recovery window, or health below the threshold. */
  get struggling(): boolean {
    return this.recovering || this.seen.health < this.state.balance.director.adapt.lowHealth;
  }

  /** Encounters under way (in their warning, active or resolving). */
  get active(): readonly Encounter[] {
    return this.encounters;
  }

  private get recovering(): boolean {
    return this.state.time < this.recoveryUntil;
  }

  private get dominant(): boolean {
    const adapt = this.state.balance.director.adapt;
    return this.seen.killRate >= adapt.fastKills && this.seen.pressure < adapt.calm;
  }

  /** One simulation step, after the spawn director (step order in docs/architecture.md). */
  update(dt: number, spawner: SpawnDirector): void {
    this.spawner = spawner;
    const rules = this.state.balance.director;
    updateBoons(this.state, dt);
    const boss = this.state.boss;
    if (boss && !boss.dead && !this.bossSeen) {
      this.bossSeen = true;
      this.bossAwoke();
    }
    this.tickEncounters(dt);

    this.observeTimer += dt;
    if (this.observeTimer >= rules.observe) {
      this.seen = this.observer.observe(this.observeTimer, this.encounterFactor());
      this.pace(this.observeTimer);
      this.observeTimer = 0;
    }
    this.thinkTimer += dt;
    if (this.thinkTimer >= rules.think) {
      this.thinkTimer = 0;
      if (this.enabled) this.think();
    }
  }

  // -------------------------------------------------------------------------------------------------------------
  // Pacing and selection

  /** Sustained high pressure opens a recovery window (spec: director-of-chaos / pacing and recovery). */
  private pace(dt: number): void {
    const p = this.state.balance.director.pressure;
    if (this.seen.pressure >= p.high) this.highFor += dt;
    else this.highFor = Math.max(0, this.highFor - dt);
    if (this.highFor >= p.recoveryAfter && !this.recovering) {
      this.recoveryUntil = this.state.time + p.recovery;
      this.highFor = 0;
    }
  }

  /** Once per think: maybe start one encounter, chosen by weight among the eligible ones. */
  private think(): void {
    const state = this.state;
    const rules = state.balance.director;
    const quiet = state.time - Math.max(this.lastStart, this.lastEnd);
    if (quiet < rules.gap) return;
    // Likelier the longer it has been quiet, less likely under pressure; relief is never held back by pressure.
    const chance = Math.min(1, (quiet - rules.gap) / rules.ramp) * (1 - 0.5 * this.seen.pressure);
    if (!this.rng.chance(Math.max(0.05, chance))) return;

    const candidates = state.index.content.encounters.filter((def) => !this.reason(def));
    if (candidates.length === 0) return;
    const adapt = rules.adapt;
    const canAdapt = state.time - this.lastAdapt >= adapt.every;
    const signals: Record<EncounterTag, boolean> = {
      relief: this.struggling,
      durable: this.dominant,
      movement: this.seen.still,
    };
    const because = new Map<string, string[]>();
    const weight = (def: EncounterDefinition) => {
      let w = def.weight;
      const why: string[] = [];
      if (canAdapt)
        for (const tag of def.tags ?? [])
          if (signals[tag]) {
            w *= adapt.boost;
            why.push(`${tag} ×${adapt.boost}`);
            break;
          }
      if (def.id === this.lastChosen) {
        w *= rules.novelty;
        why.push(`again ×${rules.novelty}`);
      }
      because.set(def.id, why);
      return w;
    };
    const weights = new Map(candidates.map((def) => [def.id, weight(def)]));
    const def = this.rng.weighted(candidates, (d) => weights.get(d.id) ?? 0);
    if (!def) return;
    const why = because.get(def.id) ?? [];
    if (!this.start(def)) return;
    // An adaptive nudge is used up only when it decided the choice (spec: director-of-chaos / adaptive rules).
    if (why.some((w) => !w.startsWith('again'))) this.lastAdapt = state.time;
    this.remember(this.decisions, {
      time: state.time,
      id: def.id,
      pressure: this.seen.pressure,
      candidates: candidates.length,
      because: why,
    });
  }

  /**
   * Why `def` cannot start now, or undefined when it can (spec: director-of-chaos / deterministic selection). Pure: the
   * report asks it too.
   */
  reason(def: EncounterDefinition): string | undefined {
    const state = this.state;
    const rules = state.balance.director;
    if (def.offered) return 'only by contract';
    if (def.realms && !def.realms.includes(state.realm.id)) return 'realm';
    if (state.realmTime < Math.max(def.from, rules.firstAt)) return 'too early';
    if (state.depth < (def.minDepth ?? 0)) return 'depth';
    const cooldown = (this.readyAt.get(def.id) ?? -Infinity) - state.time;
    if (cooldown > 0) return 'cooldown';
    if ((this.thisRealm.get(def.id) ?? 0) >= def.perRealm) return 'enough in this realm';
    if (this.encounters.some((e) => e.def.id === def.id)) return 'under way';
    const relief = def.tags?.includes('relief') ?? false;
    if (state.boss && !state.boss.dead && def.behavior.type !== 'shrine') return 'boss awake';
    if (state.gate) return 'gate open';
    if (this.running().length >= rules.maxActive) return 'too many under way';
    if (def.major) {
      if (this.running().some((e) => e.def.major)) return 'a major encounter is under way';
      if (this.recovering) return 'recovery';
      if (state.time - this.lastMajorEnd < rules.majorGap) return 'major gap';
    }
    const p = this.seen.pressure;
    const limit = def.major ? rules.pressure.major : relief ? 1 : rules.pressure.minor;
    const max = Math.min(limit, def.pressure?.max ?? 1);
    if (p > max) return `pressure ${p.toFixed(2)} > ${max.toFixed(2)}`;
    if (p < (def.pressure?.min ?? 0)) return `pressure ${p.toFixed(2)} < ${def.pressure?.min}`;
    const needs = def.requires;
    if (needs) {
      if (this.realm.corruption < (needs.corruption ?? 0))
        return `needs corruption ${needs.corruption}`;
      if (this.realm.corruption > (needs.maxCorruption ?? Infinity))
        return `needs corruption at most ${needs.maxCorruption}`;
      if (this.realm.grudge < (needs.grudge ?? 0)) return `needs a grudge`;
      if (state.eliteKills < (needs.elitesSlain ?? 0))
        return `needs ${needs.elitesSlain} elites slain`;
    }
    return undefined;
  }

  /** Encounters still warning or active: resolving ones no longer count against limits. */
  private running(): Encounter[] {
    return this.encounters.filter((e) => e.phase === 'telegraph' || e.phase === 'active');
  }

  /**
   * Starts `def` now, in its warning (eligibility is the caller's: selection, a contract or a debug command). Returns
   * undefined when its behavior finds no place for it.
   */
  start(def: EncounterDefinition, bonus?: EncounterReward): Encounter | undefined {
    const state = this.state;
    const enc: Encounter = {
      uid: this.nextUid++,
      def,
      phase: 'telegraph',
      timer: def.telegraph,
      age: 0,
      settled: false,
      x: 0,
      y: 0,
      enemies: [],
      bonus,
      label: '',
      monster: '',
      stage: 0,
      stageTime: 0,
      stageStart: 0,
      attackTimer: 0,
      attackIndex: 0,
      speed: 0,
    };
    if (!ruleOf(enc).begin(this, enc, def.behavior)) return undefined;
    this.encounters.push(enc);
    this.lastStart = state.time;
    this.lastChosen = def.id;
    this.thisRealm.set(def.id, (this.thisRealm.get(def.id) ?? 0) + 1);
    state.emit({
      type: 'announcement',
      text: def.announce.replace('{where}', enc.label).replace('{hunter}', enc.label),
      kind: 'omen',
    });
    this.phaseEvent(enc);
    return enc;
  }

  // -------------------------------------------------------------------------------------------------------------
  // The lifecycle

  /** Moves an encounter to `to` if its lifecycle allows it; returns false (and changes nothing) otherwise. */
  transition(enc: Encounter, to: EncounterPhase): boolean {
    if (!NEXT[enc.phase].includes(to)) return false;
    enc.phase = to;
    this.phaseEvent(enc);
    return true;
  }

  private tickEncounters(dt: number): void {
    // Every marker counts down its own time (a champion's arrival mark is not its eclipse's clock).
    for (const site of this.state.sites) site.left = Math.max(0, site.left - dt);
    // Behaviors may start other encounters (a contract): iterate over a copy.
    for (const enc of [...this.encounters]) {
      const rule = ruleOf(enc);
      const b = enc.def.behavior;
      switch (enc.phase) {
        case 'telegraph':
          enc.timer -= dt;
          rule.warn?.(this, enc, b, Math.min(1, 1 - enc.timer / enc.def.telegraph));
          if (enc.timer <= 0 && this.transition(enc, 'active')) {
            enc.age = 0;
            rule.start(this, enc, b);
          }
          break;
        case 'active':
          enc.age += dt;
          rule.update(this, enc, b, dt);
          break;
        case 'resolving':
          enc.timer -= dt;
          if (enc.timer <= 0) this.end(enc);
          break;
      }
    }
  }

  /** The active phase reached an ending: it is announced, its pieces cleared, and it resolves. */
  finish(enc: Encounter, outcome: string): void {
    const ending = enc.def.outcomes[outcome];
    if (!ending || !this.transition(enc, 'resolving')) return;
    enc.outcome = outcome;
    enc.timer = this.state.balance.director.resolve;
    ruleOf(enc).cleanup(this, enc, enc.def.behavior);
    this.markEnd(enc);
    const reward = ending.success ? mergeRewards(ending.reward, enc.bonus) : undefined;
    const spoils = describeReward(this.state, reward);
    this.state.emit({
      type: 'announcement',
      text: ending.text.replace('{boon}', enc.label) + (spoils ? ` ${spoils}` : ''),
      kind: 'omen',
    });
  }

  /** Resolving is over: completed or failed, and its ending applied once. */
  private end(enc: Encounter): void {
    const ending = enc.outcome ? enc.def.outcomes[enc.outcome] : undefined;
    if (!ending || !this.transition(enc, ending.success ? 'completed' : 'failed')) return;
    this.settle(enc);
    this.drop(enc);
  }

  /**
   * Applies an ended encounter's reward and realm-state change exactly once (spec: director-of-chaos / rewarded once).
   * Returns false when it was already applied or has no ending.
   */
  settle(enc: Encounter): boolean {
    const ending = enc.outcome ? enc.def.outcomes[enc.outcome] : undefined;
    if (enc.settled || !ending || enc.phase === 'cancelled') return false;
    enc.settled = true;
    const state = this.state;
    const reward = ending.success ? mergeRewards(ending.reward, enc.bonus) : undefined;
    if (reward) {
      const at = this.dropPoint(enc);
      if (reward.gold) state.spawnPickup('gold', at.x, at.y, goldOf(state, reward.gold));
      if (reward.chest) state.spawnPickup('chest', at.x, at.y + 12, 1);
      const boon = reward.boon ? state.index.boons.get(reward.boon) : undefined;
      for (const p of state.players) {
        if (!p.alive) continue;
        if (boon) grantBoon(state, p, boon);
        if (reward.heal) heal(state, p, p.stats.maxHealth * reward.heal);
      }
    }
    const rules = state.balance.director;
    const c = ending.changes;
    if (c) {
      this.realm.corruption = clamp(
        this.realm.corruption + (c.corruption ?? 0),
        rules.maxCorruption,
      );
      this.realm.grudge = clamp(this.realm.grudge + (c.grudge ?? 0), rules.maxGrudge);
    }
    return true;
  }

  /** Ends an encounter with nothing given: its pieces are cleared and it leaves no trace but its cooldown. */
  cancel(enc: Encounter, reason = 'cancelled'): void {
    const wasResolving = enc.phase === 'resolving';
    if (!this.transition(enc, 'cancelled')) return;
    if (!wasResolving) ruleOf(enc).cleanup(this, enc, enc.def.behavior);
    if (!wasResolving) this.markEnd(enc);
    enc.outcome = enc.outcome ?? reason;
    this.drop(enc);
  }

  /** A contract was accepted: its encounter starts now, with the contract's bonus (spec: director-of-chaos / contracts). */
  offer(id: string, bonus: EncounterReward, x: number, y: number): boolean {
    const def = this.state.index.encounters.get(id);
    const enc = def && this.start(def, bonus);
    if (!enc) return false;
    if (!enc.x && !enc.y) {
      enc.x = x;
      enc.y = y;
    }
    return true;
  }

  /** Places or moves an encounter's marker in the world. */
  site(
    enc: Encounter,
    kind: SiteKind,
    x: number,
    y: number,
    radius: number,
    seconds: number,
  ): void {
    const sites = this.state.sites;
    const old = enc.site;
    if (old) sites.splice(sites.indexOf(old), 1);
    enc.site = { id: this.nextSite++, kind, x, y, radius, left: seconds, total: seconds };
    sites.push(enc.site);
  }

  private markEnd(enc: Encounter): void {
    const t = this.state.time;
    this.lastEnd = t;
    if (enc.def.major) this.lastMajorEnd = t;
    this.readyAt.set(enc.def.id, t + enc.def.cooldown);
  }

  private drop(enc: Encounter): void {
    const i = this.encounters.indexOf(enc);
    if (i >= 0) this.encounters.splice(i, 1);
    this.remember(this.outcomes, {
      time: this.state.time,
      id: enc.def.id,
      phase: enc.phase,
      outcome: enc.outcome,
      realm: this.state.realm.id,
    });
  }

  /** Where rewards appear: where it ended, if that is a place a god can reach, else beside the party. */
  private dropPoint(enc: Encounter): { x: number; y: number } {
    const state = this.state;
    const b = state.arena.bounds;
    const inside = enc.x > b.minX && enc.x < b.maxX && enc.y > b.minY && enc.y < b.maxY;
    if (inside && (enc.x || enc.y) && !state.collision.isBlocked(enc.x, enc.y, 8))
      return { x: enc.x, y: enc.y };
    return state.focus();
  }

  private phaseEvent(enc: Encounter): void {
    const ending = enc.outcome ? enc.def.outcomes[enc.outcome] : undefined;
    this.state.emit({
      type: 'encounter',
      id: enc.def.id,
      phase: enc.phase,
      success: ending?.success,
      x: enc.x,
      y: enc.y,
    });
  }

  private encounterFactor(): number {
    let factor = 0;
    for (const e of this.encounters) {
      if (e.phase !== 'active') continue;
      factor = Math.max(factor, e.def.major ? 1 : 0.4);
    }
    return factor;
  }

  private remember<T>(list: T[], item: T): void {
    list.push(item);
    if (list.length > this.state.balance.director.memory) list.shift();
  }

  // -------------------------------------------------------------------------------------------------------------
  // Realms

  /**
   * The party passes a gate (spec: director-of-chaos / encounter lifecycle): an encounter already resolving is settled
   * here (its spoils are gathered with the rest), every other is cancelled.
   */
  leaveRealm(): void {
    for (const enc of [...this.encounters]) {
      if (enc.phase === 'resolving') this.end(enc);
      else this.cancel(enc, 'left the realm');
    }
  }

  /** A deeper realm: fresh counts for it, and more corruption (spec: director-of-chaos / realm state). */
  enterRealm(): void {
    const rules = this.state.balance.director;
    this.thisRealm.clear();
    this.observer.reset();
    this.bossSeen = false;
    this.realm.corruption = clamp(
      this.realm.corruption + rules.corruptionPerRealm,
      rules.maxCorruption,
    );
  }

  /** The boss awakens: encounters still giving their warning are called off (spec: director-of-chaos / pacing). */
  private bossAwoke(): void {
    for (const enc of [...this.encounters])
      if (enc.phase === 'telegraph' && enc.def.behavior.type !== 'shrine')
        this.cancel(enc, 'the boss awoke');
  }

  // -------------------------------------------------------------------------------------------------------------
  // Views

  /** Encounters under way as the HUD shows them (spec: hud / encounters on the hud). */
  hud(): HudEncounter[] {
    const out: HudEncounter[] = [];
    for (const enc of this.encounters) {
      if (enc.phase === 'resolving') continue;
      const view = ruleOf(enc).hud(this.state, enc, enc.def.behavior);
      out.push({
        uid: enc.uid,
        id: enc.def.id,
        name: enc.def.name,
        phase: enc.phase,
        objective: view.objective ?? enc.def.objective,
        left: view.left,
        seconds: view.seconds,
        risk: view.risk,
        reward: view.reward,
        major: enc.def.major,
      });
    }
    return out;
  }

  report(): DirectorReport {
    const state = this.state;
    const adapt = state.balance.director.adapt;
    const peak = this.encounters.some((e) => e.phase === 'active' && e.def.major);
    const mood: Mood = this.recovering
      ? 'recovery'
      : peak
        ? 'peak'
        : this.encounters.length > 0 || this.seen.pressure >= 0.4
          ? 'building'
          : 'calm';
    return {
      enabled: this.enabled,
      stream: `run:${state.config.seed}/chaos`,
      pressure: this.seen.pressure,
      factors: this.seen.factors,
      mood,
      recoveryLeft: Math.max(0, this.recoveryUntil - state.time),
      killRate: this.seen.killRate,
      still: this.seen.still,
      struggling: this.struggling,
      dominant: this.dominant,
      adaptIn: Math.max(0, this.lastAdapt + adapt.every - state.time),
      realm: { ...this.realm, elitesSlain: state.eliteKills },
      active: this.encounters.map((e) => ({
        uid: e.uid,
        id: e.def.id,
        phase: e.phase,
        seconds: Math.max(0, e.timer),
        outcome: e.outcome,
        x: e.site?.x ?? e.x,
        y: e.site?.y ?? e.y,
      })),
      encounters: state.index.content.encounters.map((def) => ({
        id: def.id,
        reason: this.enabled || def.offered ? this.reason(def) : 'director off',
        cooldown: Math.max(0, (this.readyAt.get(def.id) ?? -Infinity) - state.time),
        thisRealm: this.thisRealm.get(def.id) ?? 0,
      })),
      decisions: [...this.decisions],
      outcomes: [...this.outcomes],
    };
  }
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}
