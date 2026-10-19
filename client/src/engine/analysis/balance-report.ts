import { ContentIndex } from '../data/content-index';
import { GameContent } from '../data/types';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { answer, armsFirst, autopilot } from './autopilot';

export interface BalanceOptions {
  readonly gods: readonly string[];
  readonly runsPerGod: number;
  /** How long each run may last, in simulated minutes. */
  readonly minutes: number;
  readonly realmId: string;
}

export interface BalanceRow {
  readonly godId: string;
  readonly runs: number;
  readonly realmsCleared: number;
  readonly level: number;
  readonly kills: number;
  /** Seconds survived, on average. */
  readonly timeSeconds: number;
  /** Share of runs still alive when time ran out. */
  readonly survived: number;
  /** Weapons in final builds: share of runs that took each, and its share of all damage dealt. */
  readonly weapons: readonly {
    readonly id: string;
    readonly taken: number;
    readonly damageShare: number;
  }[];
}

interface Finished {
  readonly godId: string;
  readonly realmsCleared: number;
  readonly level: number;
  readonly kills: number;
  readonly timeSeconds: number;
  readonly alive: boolean;
  readonly damage: ReadonlyMap<string, number>;
}

/**
 * Plays runs with the bot for a report on balance (spec: run-statistics / balance report). The work is done in slices
 * (`advance`) so a page stays responsive. Run `i` of every god uses seed `i + 1` and no permanent upgrades, so the
 * same options always give the same report (D5).
 */
export class BalanceReport {
  private readonly index: ContentIndex;
  private readonly queue: { godId: string; seed: number }[] = [];
  private readonly finished: Finished[] = [];
  private current: { sim: RunSimulation; godId: string; steps: number } | undefined;
  private readonly stepsPerRun: number;
  private stepsDone = 0;

  constructor(
    content: GameContent | ContentIndex,
    private readonly options: BalanceOptions,
  ) {
    this.index = content instanceof ContentIndex ? content : new ContentIndex(content);
    for (const godId of options.gods)
      for (let i = 0; i < options.runsPerGod; i++) this.queue.push({ godId, seed: i + 1 });
    this.stepsPerRun = Math.max(1, Math.round((options.minutes * 60) / STEP));
  }

  /** Share of the work done, 0–1. */
  get progress(): number {
    const total =
      (this.queue.length + this.finished.length + (this.current ? 1 : 0)) * this.stepsPerRun;
    return total > 0 ? Math.min(1, this.stepsDone / total) : 1;
  }

  get done(): boolean {
    return !this.current && this.queue.length === 0;
  }

  /** Plays up to `maxSteps` simulation steps; returns true while work remains. */
  advance(maxSteps: number): boolean {
    let budget = maxSteps;
    while (budget > 0 && !this.done) {
      const run = (this.current ??= this.start());
      if (!run) break;
      const sim = run.sim;
      while (budget > 0 && run.steps < this.stepsPerRun && sim.phase !== 'ended') {
        while (sim.phase === 'choosing') sim.choose(answer(sim, armsFirst));
        sim.step(STEP, [autopilot(sim)]);
        run.steps++;
        this.stepsDone++;
        budget--;
      }
      if (run.steps >= this.stepsPerRun || sim.phase === 'ended') this.finish(run);
    }
    return !this.done;
  }

  rows(): BalanceRow[] {
    return this.options.gods.map((godId) => {
      const runs = this.finished.filter((f) => f.godId === godId);
      const n = Math.max(1, runs.length);
      const avg = (pick: (f: Finished) => number) => runs.reduce((s, f) => s + pick(f), 0) / n;
      const damage = new Map<string, number>();
      const taken = new Map<string, number>();
      for (const f of runs)
        for (const [id, d] of f.damage) {
          damage.set(id, (damage.get(id) ?? 0) + d);
          taken.set(id, (taken.get(id) ?? 0) + 1);
        }
      const total = [...damage.values()].reduce((s, d) => s + d, 0) || 1;
      return {
        godId,
        runs: runs.length,
        realmsCleared: avg((f) => f.realmsCleared),
        level: avg((f) => f.level),
        kills: avg((f) => f.kills),
        timeSeconds: avg((f) => f.timeSeconds),
        survived: avg((f) => (f.alive ? 1 : 0)),
        weapons: [...damage.keys()]
          .map((id) => ({
            id,
            taken: (taken.get(id) ?? 0) / n,
            damageShare: (damage.get(id) ?? 0) / total,
          }))
          .sort((a, b) => b.damageShare - a.damageShare),
      };
    });
  }

  private start(): { sim: RunSimulation; godId: string; steps: number } | undefined {
    const next = this.queue.shift();
    if (!next) return undefined;
    const sim = new RunSimulation(
      {
        runId: `balance-${next.godId}-${next.seed}`,
        godId: next.godId,
        realmId: this.options.realmId,
        seed: next.seed,
        modifiers: [],
      },
      this.index,
    );
    return { sim, godId: next.godId, steps: 0 };
  }

  private finish(run: { sim: RunSimulation; godId: string; steps: number }): void {
    // A run cut short by its time still finishes its last steps' worth of progress.
    this.stepsDone += this.stepsPerRun - run.steps;
    const state = run.sim.state;
    const player = state.players[0];
    this.finished.push({
      godId: run.godId,
      realmsCleared: state.depth + (state.bossDefeated ? 1 : 0),
      level: state.level,
      kills: state.kills,
      timeSeconds: state.time,
      alive: player.alive,
      damage: new Map(player.loadout.weapons.map((w) => [w.def.id, w.damageDealt])),
    });
    this.current = undefined;
  }
}
