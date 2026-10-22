import { Injectable, InjectionToken, inject } from '@angular/core';
import { RunResult } from '../../engine';
import { GameServer, ServerError } from './game-server';
import { tableOf } from './save/glory';

/** Runs waiting to be sent, at most this many (the oldest go first). */
const QUEUE_SIZE = 20;
const QUEUE_KEY = 'olympus-unbound/world-scores';

/** A world board (spec: world-leaderboards): the Hall's tables, and one Daily Trial board per date. */
export type WorldBoard = 'solo' | 'allies' | 'coop' | 'quick' | 'daily';

/** A run as the server takes it (design: World leaderboards). */
export interface WorldSubmission {
  readonly runId: string;
  readonly board: WorldBoard;
  readonly date?: string;
  readonly names: readonly string[];
  readonly godId: string;
  readonly realmId: string;
  readonly players: number;
  readonly bots: number;
  readonly realmsCleared: number;
  readonly timeSeconds: number;
  readonly kills: number;
  readonly level: number;
  readonly version: string;
}

/** A world board entry as the Hall shows it. */
export interface WorldEntry {
  readonly id: string;
  readonly rank: number;
  readonly names: readonly string[];
  readonly godId: string;
  readonly realmId: string;
  readonly players: number;
  readonly bots: number;
  readonly realmsCleared: number;
  readonly timeSeconds: number;
  readonly kills: number;
  readonly level: number;
  readonly score: number;
  readonly endedAt: string;
}

/** Where the waiting runs are kept: browser storage, apart from the save (D8: the save format is unchanged). */
export const WORLD_SCORES_STORAGE = new InjectionToken<
  Pick<Storage, 'getItem' | 'setItem'> | undefined
>('WORLD_SCORES_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return typeof localStorage === 'undefined' ? undefined : localStorage;
    } catch {
      return undefined;
    }
  },
});

/** The world board a finished run goes to, or none (spec: world-leaderboards / submitting runs). */
export function worldBoardOf(r: RunResult): { board: WorldBoard; date?: string } | undefined {
  if (r.variant?.kind === 'daily') return { board: 'daily', date: r.variant.date };
  const table = tableOf(r);
  return table ? { board: table } : undefined;
}

/**
 * The world boards (spec: world-leaderboards): sends finished runs, keeps those it could not send and tries them again
 * at the next start, and reads the boards for the Hall.
 */
@Injectable({ providedIn: 'root' })
export class WorldScores {
  private readonly server = inject(GameServer);
  private readonly storage = inject(WORLD_SCORES_STORAGE);
  private flushing: Promise<void> | undefined;

  /** The world boards exist in this build (it knows a game server). */
  readonly available = this.server.configured;

  /**
   * Sends a finished run. `names`: the players' chosen names (the party's in co-op). A guest's co-op run is the
   * host's to send, so `guest` runs are not sent (spec: world-leaderboards / submitting runs).
   */
  submit(r: RunResult, names: readonly string[], version: string, guest = false): void {
    if (!this.available || guest) return;
    const target = worldBoardOf(r);
    if (!target || names.length === 0) return;
    this.enqueue({
      runId: r.runId,
      ...target,
      names: names.slice(0, 4),
      godId: r.godId,
      realmId: r.realmId,
      players: r.players,
      bots: r.bots,
      realmsCleared: r.realmsCleared,
      timeSeconds: Math.floor(r.timeSeconds),
      kills: r.kills,
      level: r.level,
      version,
    });
    void this.flush();
  }

  /** Sends what is waiting, oldest first; keeps what the server could not take now. */
  flush(): Promise<void> {
    if (!this.available) return Promise.resolve();
    this.flushing ??= this.send().finally(() => (this.flushing = undefined));
    return this.flushing;
  }

  /** The best of a board (spec: world-leaderboards / world tables). */
  async board(
    board: WorldBoard,
    filter: { date?: string; godId?: string } = {},
  ): Promise<WorldEntry[]> {
    const query = new URLSearchParams({ limit: '10' });
    if (filter.date) query.set('date', filter.date);
    if (filter.godId) query.set('god', filter.godId);
    const { entries } = await this.server.get<{ entries: WorldEntry[] }>(
      `/api/leaderboards/${board}?${query}`,
    );
    return Array.isArray(entries) ? entries : [];
  }

  private async send(): Promise<void> {
    for (const run of this.queue()) {
      try {
        await this.server.post('/api/scores', run);
      } catch (e) {
        // Unreachable, or too many for now: try again later. Refused for good (400): drop it.
        if (!(e instanceof ServerError) || e.status === 0 || e.status === 429 || e.status >= 500)
          return;
      }
      this.save(this.queue().filter((q) => q.runId !== run.runId));
    }
  }

  private enqueue(run: WorldSubmission): void {
    const queue = this.queue().filter((q) => q.runId !== run.runId);
    this.save([...queue, run].slice(-QUEUE_SIZE));
  }

  private queue(): WorldSubmission[] {
    try {
      const raw = this.storage?.getItem(QUEUE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as WorldSubmission[]) : [];
    } catch {
      return [];
    }
  }

  private save(queue: readonly WorldSubmission[]): void {
    try {
      this.storage?.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // Storage full or blocked: the run is simply not sent.
    }
  }
}
