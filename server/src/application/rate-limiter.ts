import type { Clock } from './ports.js';

/**
 * At most `max` uses per key in each window of `windowMs` (spec: game-server / limits). Kept in memory only: the
 * keys are addresses, and the server stores none (spec: game-server / what the server keeps).
 */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; used: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly clock: Clock,
  ) {}

  /** Uses one; false when the key has used its share of the current window. */
  take(key: string): boolean {
    const now = this.clock.now().getTime();
    let w = this.windows.get(key);
    if (!w || now - w.start >= this.windowMs) {
      w = { start: now, used: 0 };
      this.windows.set(key, w);
    }
    if (w.used >= this.max) return false;
    w.used++;
    if (this.windows.size > 10_000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    for (const [key, w] of this.windows)
      if (now - w.start >= this.windowMs) this.windows.delete(key);
  }
}
