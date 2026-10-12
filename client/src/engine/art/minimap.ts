import { ArenaData } from '../maps/generate-arena';
import { WorldFrame } from '../sim/world-frame';

/** What the minimap shows at a world position (spec: hud / minimap). */
export type MinimapMarkKind = 'enemy' | 'elite' | 'boss' | 'gate' | 'player' | 'self' | 'fallen';

export interface MinimapMark {
  readonly kind: MinimapMarkKind;
  readonly x: number;
  readonly y: number;
  /** The player's seat, for their colour. */
  readonly seat?: number;
}

/** Each seat's colour on the minimap, in seat order. */
export const SEAT_COLORS: readonly number[] = [0xffd27a, 0x7ec8ff, 0x8fe39a, 0xd59cff];

/**
 * Everything the minimap marks in one frame, drawn in this order: enemies, elites, the gate, the boss, the fallen,
 * other gods, then the local god on top. Players who left are not shown.
 */
export function minimapMarks(world: WorldFrame, localId: number): MinimapMark[] {
  const marks: MinimapMark[] = [];
  for (const e of world.enemies) {
    if (e.dead || e.boss) continue;
    marks.push({ kind: e.elite ? 'elite' : 'enemy', x: e.x, y: e.y });
  }
  marks.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'enemy' ? -1 : 1));
  if (world.gate) marks.push({ kind: 'gate', x: world.gate.x, y: world.gate.y });
  if (world.boss && !world.boss.dead)
    marks.push({ kind: 'boss', x: world.boss.x, y: world.boss.y });
  const players = world.players.map((p, seat) => ({ p, seat })).filter(({ p }) => !p.left);
  for (const { p, seat } of players)
    if (!p.alive) marks.push({ kind: 'fallen', x: p.x, y: p.y, seat });
  for (const { p, seat } of players)
    if (p.alive && p.id !== localId) marks.push({ kind: 'player', x: p.x, y: p.y, seat });
  for (const { p, seat } of players)
    if (p.alive && p.id === localId) marks.push({ kind: 'self', x: p.x, y: p.y, seat });
  return marks;
}

/** World units to minimap pixels: the whole arena fits `size`, centred. */
export function minimapScale(arena: Pick<ArenaData, 'width' | 'height'>, size: number) {
  const k = size / Math.max(arena.width, arena.height);
  return {
    k,
    ox: (size - arena.width * k) / 2,
    oy: (size - arena.height * k) / 2,
  };
}

/**
 * The minimap's still picture, `size` pixels square: the painted ground shrunk and darkened, obstacles as pale
 * blocks (so the Labyrinth's corridors read), and the boss arena's ring.
 */
export function paintMinimapBase(
  g: CanvasRenderingContext2D,
  size: number,
  arena: ArenaData,
  ground: HTMLCanvasElement,
): void {
  const { k, ox, oy } = minimapScale(arena, size);
  g.fillStyle = '#0b0908';
  g.fillRect(0, 0, size, size);
  g.imageSmoothingEnabled = true;
  g.drawImage(ground, ox, oy, arena.width * k, arena.height * k);
  g.fillStyle = 'rgba(8,6,5,0.45)';
  g.fillRect(0, 0, size, size);
  // Every obstacle as a pale block of its size: close-set wall blocks read as walls, the rest as scattered stones.
  g.fillStyle = 'rgba(206,190,156,0.8)';
  for (const o of arena.obstacles) {
    const r = Math.max(0.9, o.radius * k * 1.25);
    g.fillRect(ox + o.x * k - r, oy + o.y * k - r, r * 2, r * 2);
  }
  const b = arena.bossArena;
  g.strokeStyle = 'rgba(200,60,40,0.75)';
  g.lineWidth = Math.max(1, size / 160);
  g.beginPath();
  g.arc(ox + b.x * k, oy + b.y * k, b.radius * k, 0, Math.PI * 2);
  g.stroke();
}
