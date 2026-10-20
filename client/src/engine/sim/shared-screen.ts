import { RunState } from './run-state';

/** The camera zooms out to this share of its usual scale at most (spec: co-op / local co-op on one screen). */
export const SHARED_ZOOM_OUT = 0.7;
/** World units kept between the outermost god and the screen's edge. */
export const SHARED_MARGIN = 150;

/** The largest spread of the living local gods on each axis: the zoomed-out view less its margins. */
export function maxSpread(view: { readonly halfWidth: number; readonly halfHeight: number }): {
  x: number;
  y: number;
} {
  return {
    x: Math.max(0, (view.halfWidth * 2) / SHARED_ZOOM_OUT - SHARED_MARGIN * 2),
    y: Math.max(0, (view.halfHeight * 2) / SHARED_ZOOM_OUT - SHARED_MARGIN * 2),
  };
}

/**
 * The soft edge of a shared screen (spec: co-op / local co-op on one screen): a living local god may not walk further
 * from the others than the zoomed-out view allows. Only movement outward this step is held back, so nobody is ever
 * dragged; bots are not held (they follow the party themselves).
 */
export function holdParty(state: RunState): void {
  if (!state.config.sharedScreen) return;
  const gods = state.players.filter((p) => p.alive && !p.bot && !p.left);
  if (gods.length < 2) return;
  const spread = maxSpread(state.view);
  for (const p of gods) {
    let loX = Infinity;
    let hiX = -Infinity;
    let loY = Infinity;
    let hiY = -Infinity;
    for (const o of gods) {
      if (o === p) continue;
      loX = Math.min(loX, o.x);
      hiX = Math.max(hiX, o.x);
      loY = Math.min(loY, o.y);
      hiY = Math.max(hiY, o.y);
    }
    const x = hold(p.x, p.px, hiX - spread.x, loX + spread.x);
    const y = hold(p.y, p.py, hiY - spread.y, loY + spread.y);
    if (x !== p.x || y !== p.y) {
      p.x = x;
      p.y = y;
      state.collision.resolve(p);
    }
  }
}

/** `value` kept within [min, max], except that it never needs to move back past where it was (`from`). */
function hold(value: number, from: number, min: number, max: number): number {
  if (value < min) return Math.max(value, Math.min(from, min));
  if (value > max) return Math.min(value, Math.max(from, max));
  return value;
}

/** The middle and size of the box around some gods, between their previous and current positions by `alpha`. */
export function partyFrame(
  gods: readonly {
    readonly x: number;
    readonly y: number;
    readonly px: number;
    readonly py: number;
  }[],
  alpha: number,
): { x: number; y: number; spreadX: number; spreadY: number } {
  let loX = Infinity;
  let hiX = -Infinity;
  let loY = Infinity;
  let hiY = -Infinity;
  for (const g of gods) {
    const x = g.px + (g.x - g.px) * alpha;
    const y = g.py + (g.y - g.py) * alpha;
    loX = Math.min(loX, x);
    hiX = Math.max(hiX, x);
    loY = Math.min(loY, y);
    hiY = Math.max(hiY, y);
  }
  if (gods.length === 0) return { x: 0, y: 0, spreadX: 0, spreadY: 0 };
  return { x: (loX + hiX) / 2, y: (loY + hiY) / 2, spreadX: hiX - loX, spreadY: hiY - loY };
}
