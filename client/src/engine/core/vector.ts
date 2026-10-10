export interface Vec2 {
  x: number;
  y: number;
}

export function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(distanceSq(ax, ay, bx, by));
}

/** Unit vector from (ax, ay) toward (bx, by); (1, 0) when the points coincide. */
export function direction(ax: number, ay: number, bx: number, by: number): Vec2 {
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.sqrt(dx * dx + dy * dy);
  return length > 1e-9 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
}

/** Limits a vector to length 1 (keeps shorter analog input as is). */
export function clampLength(x: number, y: number, max = 1): Vec2 {
  const length = Math.sqrt(x * x + y * y);
  return length > max ? { x: (x / length) * max, y: (y / length) * max } : { x, y };
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Smallest signed difference between two angles, in (-π, π]. */
export function angleDifference(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Squared distance from point P to the segment AB. */
export function distanceToSegmentSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq > 0 ? clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1) : 0;
  return distanceSq(px, py, ax + abx * t, ay + aby * t);
}
