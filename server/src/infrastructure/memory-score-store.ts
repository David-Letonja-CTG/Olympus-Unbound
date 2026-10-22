import type { ScoreEntry } from '../domain/score.js';
import type { BoardQuery, Clock, ScoreStore, StoredScore } from '../application/ports.js';

/**
 * World board entries in memory: for tests, the end-to-end tests and playing locally without a database. Lost when the
 * server stops; production uses PostgreSQL.
 */
export class MemoryScoreStore implements ScoreStore {
  private readonly entries: (StoredScore & { hidden: boolean })[] = [];
  private nextId = 1;

  constructor(private readonly clock: Clock) {}

  async add(entry: ScoreEntry): Promise<'added' | 'duplicate'> {
    if (this.entries.some((e) => e.runId === entry.runId)) return 'duplicate';
    this.entries.push({
      ...entry,
      id: String(this.nextId++),
      endedAt: this.clock.now().toISOString(),
      hidden: false,
    });
    return 'added';
  }

  async top(query: BoardQuery): Promise<StoredScore[]> {
    return this.entries
      .filter(
        (e) =>
          !e.hidden &&
          e.board === query.board &&
          (query.date === undefined || e.date === query.date) &&
          (query.godId === undefined || e.godId === query.godId),
      )
      .sort((a, b) => b.score - a.score || a.endedAt.localeCompare(b.endedAt) || +a.id - +b.id)
      .slice(0, query.limit)
      .map(({ hidden: _hidden, ...entry }) => entry);
  }

  async hide(id: string): Promise<boolean> {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return false;
    entry.hidden = true;
    return true;
  }
}
