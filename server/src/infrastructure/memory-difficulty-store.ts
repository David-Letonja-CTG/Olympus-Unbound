import type { DifficultyDial } from '../domain/difficulty.js';
import type { DifficultyStore } from '../application/ports.js';

/** The difficulty dial in memory: for tests and playing locally without a database. */
export class MemoryDifficultyStore implements DifficultyStore {
  private dial: DifficultyDial | undefined;

  async getDifficulty(): Promise<DifficultyDial | undefined> {
    return this.dial;
  }

  async setDifficulty(dial: DifficultyDial): Promise<void> {
    this.dial = dial;
  }
}
