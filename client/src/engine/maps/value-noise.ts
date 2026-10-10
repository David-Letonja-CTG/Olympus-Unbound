import { Rng } from '../core/rng';

/**
 * Smooth 2D value noise in [0, 1): random values on an integer lattice, blended with smoothstep.
 * Lattice values come from the seeded Rng, so the field is deterministic per seed.
 */
export class ValueNoise {
  private readonly values: Float32Array;

  constructor(
    rng: Rng,
    private readonly size = 256,
  ) {
    this.values = new Float32Array(size * size);
    for (let i = 0; i < this.values.length; i++) this.values[i] = rng.next();
  }

  sample(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const sx = smooth(x - x0);
    const sy = smooth(y - y0);
    const a = this.at(x0, y0);
    const b = this.at(x0 + 1, y0);
    const c = this.at(x0, y0 + 1);
    const d = this.at(x0 + 1, y0 + 1);
    const top = a + (b - a) * sx;
    const bottom = c + (d - c) * sx;
    return top + (bottom - top) * sy;
  }

  /** Two octaves: broad shapes plus finer variation, normalised back to [0, 1). */
  fractal(x: number, y: number): number {
    return (this.sample(x, y) * 2 + this.sample(x * 2.3 + 17, y * 2.3 + 31)) / 3;
  }

  private at(x: number, y: number): number {
    const s = this.size;
    return this.values[(((y % s) + s) % s) * s + (((x % s) + s) % s)];
  }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
