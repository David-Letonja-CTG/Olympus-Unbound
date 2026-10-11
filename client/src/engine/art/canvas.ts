/**
 * Canvas 2D drawing helpers for the code-drawn art (D9). The look follows `docs/art-direction.md`: light from the
 * upper left, dark outlines for silhouettes, a thin cold rim light, worn and desaturated materials.
 */

export type Ctx = CanvasRenderingContext2D;
export type Painter = (g: Ctx, s: number) => void;

export interface SpriteSpec {
  readonly size: number;
  readonly paint: Painter;
}

export const hex = (c: number, a = 1) =>
  `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

/** Multiplies a colour's channels by `f` (darken < 1 < lighten). */
export function shade(c: number, f: number): number {
  const ch = (v: number) => Math.min(255, Math.max(0, Math.round(v * f)));
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
}

/** Linear blend of two colours. */
export function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export const OUTLINE = 'rgba(8,6,10,0.85)';
/** Cold moonlight on the edges facing the light. */
export const RIM = 0xc8d4ff;

export function circle(
  g: Ctx,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  width = 2,
): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = width;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function ellipse(
  g: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string,
): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = 2;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function path(g: Ctx, points: readonly number[]): void {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath();
}

export function poly(
  g: Ctx,
  points: readonly number[],
  fill: string,
  stroke?: string,
  width = 2,
): void {
  path(g, points);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function line(g: Ctx, points: readonly number[], color: string, width: number): void {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

export function glow(g: Ctx, x: number, y: number, r: number, color: number, alpha = 0.6): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, hex(color, alpha));
  grad.addColorStop(1, hex(color, 0));
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A lightning bolt from (x, y) scaled to height h. */
export function bolt(
  g: Ctx,
  x: number,
  y: number,
  h: number,
  fill: string,
  stroke = 'rgba(255,255,255,0.9)',
): void {
  const w = h * 0.5;
  poly(
    g,
    [
      x + w * 0.15,
      y,
      x - w * 0.45,
      y + h * 0.55,
      x - w * 0.02,
      y + h * 0.55,
      x - w * 0.2,
      y + h,
      x + w * 0.5,
      y + h * 0.38,
      x + w * 0.05,
      y + h * 0.38,
      x + w * 0.35,
      y,
    ],
    fill,
    stroke,
    1.5,
  );
}

/** A gradient lit from the upper left across a box: highlight → base → deep shadow. */
function litGradient(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  base: number,
  contrast = 1,
): CanvasGradient {
  const grad = g.createLinearGradient(x - w * 0.5, y - h * 0.6, x + w * 0.45, y + h * 0.6);
  grad.addColorStop(0, hex(shade(base, 1 + 0.45 * contrast)));
  grad.addColorStop(0.45, hex(base));
  grad.addColorStop(1, hex(shade(base, 1 - 0.6 * contrast)));
  return grad;
}

/**
 * A shaded rounded volume (body, head, boulder): lit gradient, dark outline, and a rim of cold light on the edge
 * facing the light.
 */
export function volume(
  g: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  base: number,
  options: { outline?: number; rim?: number; contrast?: number } = {},
): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = litGradient(g, x, y, rx * 2, ry * 2, base, options.contrast);
  g.fill();
  g.lineWidth = options.outline ?? Math.max(1.5, rx * 0.12);
  g.strokeStyle = OUTLINE;
  g.stroke();
  if (options.rim !== 0) {
    g.beginPath();
    g.ellipse(x, y, rx * 0.9, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.55);
    g.lineWidth = Math.max(1, rx * 0.08);
    g.strokeStyle = hex(RIM, options.rim ?? 0.45);
    g.stroke();
  }
}

/** A shaded polygon (armour plates, robes, stone): lit gradient across its bounds and a dark outline. */
export function slab(
  g: Ctx,
  points: readonly number[],
  base: number,
  options: { outline?: number; contrast?: number } = {},
): void {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  path(g, points);
  g.fillStyle = litGradient(
    g,
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    maxX - minX,
    maxY - minY,
    base,
    options.contrast,
  );
  g.fill();
  g.lineWidth = options.outline ?? 2;
  g.lineJoin = 'round';
  g.strokeStyle = OUTLINE;
  g.stroke();
}

/** A pair of glowing eyes. */
export function eyes(g: Ctx, x: number, y: number, gap: number, r: number, color: number): void {
  for (const dx of [-gap / 2, gap / 2]) {
    glow(g, x + dx, y, r * 3.2, color, 0.7);
    circle(g, x + dx, y, r, hex(shade(color, 1.3)));
  }
}

/** A soft contact shadow baked under a character (the view adds a separate ground shadow too). */
export function footShadow(g: Ctx, s: number, w = 0.32, y = 0.82): void {
  const grad = g.createRadialGradient(s / 2, s * y, 0, s / 2, s * y, s * w);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.translate(s / 2, s * y);
  g.scale(1, 0.32);
  g.translate(-s / 2, -s * y);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s * 2);
  g.restore();
}

/** Thin bright edge along a curve (metal highlight). */
export function sheen(g: Ctx, points: readonly number[], alpha = 0.55, width = 1.5): void {
  line(g, points, `rgba(255,248,230,${alpha})`, width);
}
