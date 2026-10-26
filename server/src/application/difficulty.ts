import { checkDial, DEFAULT_DIAL, type DifficultyDial } from '../domain/difficulty.js';
import type { DifficultyStore } from './ports.js';

/**
 * The difficulty dial (spec: difficulty-dial, D23): anyone may read it, the admin sets it. Until it is first set the
 * default (every value 1) stands.
 */
export class Difficulty {
  constructor(private readonly store: DifficultyStore) {}

  async current(): Promise<DifficultyDial> {
    return (await this.store.getDifficulty()) ?? DEFAULT_DIAL;
  }

  async set(input: unknown): Promise<{ dial: DifficultyDial } | { refusal: 'bad-dial' }> {
    const checked = checkDial(input);
    if ('refusal' in checked) return checked;
    await this.store.setDifficulty(checked.dial);
    return checked;
  }
}
