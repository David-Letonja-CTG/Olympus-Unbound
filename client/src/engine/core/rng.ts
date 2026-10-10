/** Hashes a string or number to a 32-bit unsigned seed (FNV-1a over the decimal/text form). */
export function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The only source of randomness in gameplay code (D5): a small, fast deterministic generator (mulberry32).
 * `fork(label)` derives an independent stream, so e.g. combat rolls never shift map generation.
 */
export class Rng {
  private state: number;
  private readonly seed: number;

  constructor(seed: string | number) {
    this.seed = hashSeed(seed);
    this.state = this.seed;
  }

  /** A number in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A number in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** An integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** An angle in [0, 2π). */
  angle(): number {
    return this.next() * Math.PI * 2;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty list.');
    return items[Math.floor(this.next() * items.length)];
  }

  /** Picks by weight; items with weight ≤ 0 are never picked. Returns undefined when nothing can be picked. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    let total = 0;
    for (const item of items) total += Math.max(0, weight(item));
    if (total <= 0) return undefined;
    let roll = this.next() * total;
    for (const item of items) {
      const w = Math.max(0, weight(item));
      if (w <= 0) continue;
      roll -= w;
      if (roll < 0) return item;
    }
    // Floating-point leftovers: the last positive-weight item.
    for (let i = items.length - 1; i >= 0; i--) if (weight(items[i]) > 0) return items[i];
    return undefined;
  }

  /** An independent stream derived from this generator's seed and a label. */
  fork(label: string): Rng {
    return new Rng(`${this.seed}:${label}`);
  }
}
