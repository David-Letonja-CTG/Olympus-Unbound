import type { Ambience } from '../data/types';

/**
 * The view's own creatures and storms (spec: visual-atmosphere / ambient life): plain logic, no Phaser, so it can be
 * tested; the simulation never sees any of it, and its randomness is cosmetic.
 */

type Kind = NonNullable<Ambience['wildlife']>['kind'];

export interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Sitting about, flying or running off, or waiting to be placed again. */
  state: 'idle' | 'fleeing' | 'gone';
  /** Seconds in this state (fleeing), or until placed again (gone). */
  t: number;
  /** Faces left. */
  left: boolean;
  /** A phase for wing beats and twitches. */
  readonly seed: number;
}

/** A god this close makes a creature flee. */
export const FLEE_RANGE = 140;
/** Seconds a creature takes to flee out of sight. */
export const FLEE_TIME = 1.4;
const NEAR = 260;
const FAR = 520;
/** Beyond this from the view's focus a sitting creature is placed again nearer. */
const LOST = 900;

interface Point {
  readonly x: number;
  readonly y: number;
}
interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class Flock {
  readonly creatures: Creature[] = [];

  constructor(
    count: number,
    private readonly kind: Kind,
    private readonly random: () => number = Math.random,
  ) {
    for (let i = 0; i < count; i++)
      this.creatures.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        state: 'gone',
        t: this.random() * 2,
        left: false,
        seed: this.random() * 100,
      });
  }

  /** Flies: birds and bats leave upward; hoppers and crawlers run along the ground. */
  get flies(): boolean {
    return this.kind === 'bird' || this.kind === 'bat';
  }

  update(
    dt: number,
    focus: Point,
    gods: readonly Point[],
    view: Rect,
    blocked: (x: number, y: number) => boolean,
  ): void {
    for (const c of this.creatures) {
      if (c.state === 'gone') {
        if ((c.t -= dt) <= 0) this.place(c, focus, gods, view, blocked);
        continue;
      }
      if (c.state === 'fleeing') {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if ((c.t += dt) >= FLEE_TIME) this.vanish(c);
        continue;
      }
      if ((c.x - focus.x) ** 2 + (c.y - focus.y) ** 2 > LOST * LOST) {
        this.vanish(c);
        continue;
      }
      for (const g of gods) {
        const dx = c.x - g.x;
        const dy = c.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d > FLEE_RANGE) continue;
        const ux = d > 0 ? dx / d : 1;
        const uy = d > 0 ? dy / d : 0;
        c.state = 'fleeing';
        c.t = 0;
        if (this.flies) {
          c.vx = ux * 200;
          c.vy = uy * 60 - 220;
        } else {
          c.vx = ux * 190;
          c.vy = uy * 190;
        }
        c.left = c.vx < 0;
        break;
      }
    }
  }

  /** Sight of the creature fading as it flees. */
  alpha(c: Creature): number {
    return c.state === 'idle' ? 1 : c.state === 'fleeing' ? Math.max(0, 1 - c.t / FLEE_TIME) : 0;
  }

  private vanish(c: Creature): void {
    c.state = 'gone';
    c.t = 1 + this.random() * 2;
  }

  /** On open ground in the view, not too near the gods and not too far off. */
  private place(
    c: Creature,
    focus: Point,
    gods: readonly Point[],
    view: Rect,
    blocked: (x: number, y: number) => boolean,
  ): void {
    for (let attempt = 0; attempt < 4; attempt++) {
      const a = this.random() * Math.PI * 2;
      const d = NEAR + this.random() * (FAR - NEAR);
      const x = focus.x + Math.cos(a) * d;
      const y = focus.y + Math.sin(a) * d;
      if (x < view.x + 20 || y < view.y + 20 || x > view.x + view.width - 20) continue;
      if (y > view.y + view.height - 20 || blocked(x, y)) continue;
      if (gods.some((g) => (g.x - x) ** 2 + (g.y - y) ** 2 < (FLEE_RANGE * 1.5) ** 2)) continue;
      Object.assign(c, { x, y, vx: 0, vy: 0, state: 'idle', t: 0, left: this.random() < 0.5 });
      return;
    }
    c.t = 0.5;
  }
}

/** Zeus's storm: a flash now and then, twice in quick succession, and its thunder a moment later. */
export class Storm {
  private next: number;
  private sinceStrike = Infinity;
  private thunderIn = Infinity;

  constructor(
    private readonly every: readonly [number, number],
    private readonly random: () => number = Math.random,
  ) {
    this.next = this.interval();
  }

  /** Advances the storm; returns the flash's brightness now (0–1) and whether thunder rolls this frame. */
  update(dt: number): { flash: number; thunder: boolean } {
    this.sinceStrike += dt;
    if ((this.next -= dt) <= 0) {
      this.next = this.interval();
      this.sinceStrike = 0;
      this.thunderIn = 0.5 + this.random() * 0.7;
    }
    let thunder = false;
    if (this.thunderIn !== Infinity && (this.thunderIn -= dt) <= 0) {
      this.thunderIn = Infinity;
      thunder = true;
    }
    const t = this.sinceStrike;
    const flash = t < 0.12 ? 1 - t / 0.12 : t > 0.2 && t < 0.3 ? 0.7 * (1 - (t - 0.2) / 0.1) : 0;
    return { flash, thunder };
  }

  private interval(): number {
    return this.every[0] + this.random() * (this.every[1] - this.every[0]);
  }
}
