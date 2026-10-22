import { checkSubmission, isBoard, isNearDate, type ScoreRefusal } from '../domain/score.js';
import { isContentId } from '../domain/ids.js';
import type { Clock, ScoreStore, StoredScore } from './ports.js';

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export type SubmitResult =
  | { readonly status: 'added' | 'duplicate'; readonly score: number }
  | { readonly refusal: ScoreRefusal };

export type TopResult = { readonly entries: StoredScore[] } | { readonly refusal: 'bad-query' };

/** The world boards (spec: world-leaderboards): checked entries in, the best out. */
export class Leaderboards {
  constructor(
    private readonly store: ScoreStore,
    private readonly clock: Clock,
  ) {}

  async submit(input: unknown): Promise<SubmitResult> {
    const checked = checkSubmission(input, this.clock.now());
    if ('refusal' in checked) return checked;
    const status = await this.store.add(checked.entry);
    return { status, score: checked.entry.score };
  }

  async top(query: {
    board: unknown;
    date?: unknown;
    god?: unknown;
    limit?: unknown;
  }): Promise<TopResult> {
    const { board } = query;
    if (!isBoard(board)) return { refusal: 'bad-query' };
    let date: string | undefined;
    if (board === 'daily') {
      if (!isNearDate(query.date, this.clock.now())) return { refusal: 'bad-query' };
      date = query.date;
    }
    const godId = query.god === undefined || query.god === '' ? undefined : query.god;
    if (godId !== undefined && !isContentId(godId)) return { refusal: 'bad-query' };
    const raw = query.limit === undefined ? DEFAULT_LIMIT : Number(query.limit);
    const limit = Number.isInteger(raw) ? Math.min(MAX_LIMIT, Math.max(1, raw)) : DEFAULT_LIMIT;
    return { entries: await this.store.top({ board, date, godId, limit }) };
  }

  hide(id: string): Promise<boolean> {
    return this.store.hide(id);
  }
}
