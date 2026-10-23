import { bossAsEnemy } from '../bosses/boss';
import { ContentIndex } from '../data/content-index';
import { SNAPSHOT_FORMAT } from './protocol';
import { Element, ELEMENTS, EnemyDefinition, GodDefinition } from '../data/types';
import { RunState } from '../sim/run-state';
import { PickupKind, RunPhase, SiteKind, Zone } from '../sim/types';
import {
  FrameEnemy,
  FrameHazard,
  FrameWall,
  FrameCompanion,
  FrameHostile,
  FramePickup,
  FramePlayer,
  FrameProjectile,
  FrameSite,
} from '../sim/world-frame';

/** Quarter pixels: ±8191 px, twice the largest arena. */
const POS = 4;
const RADIUS = 8;
const TIMER = 100;
const PHASES: readonly RunPhase[] = ['playing', 'choosing', 'paused', 'ended'];
const PICKUPS: readonly PickupKind[] = ['xp', 'gold', 'heal', 'chest'];
const SITES: readonly SiteKind[] = ['rift', 'arrival', 'shrine', 'altar'];
/** Hundredths of a second in 16 bits: up to about 11 minutes. */
const LONG_TIMER = 100;

export interface SnapPlayer extends FramePlayer {
  readonly god: GodDefinition;
  readonly moveSpeed: number;
  /** Stamina, to the snapshot's precision (a guest corrects its prediction by it). */
  readonly stamina: number;
  // Writable: a guest draws its own god where it predicts it (net/guest.ts).
  x: number;
  y: number;
  px: number;
  py: number;
  moving: boolean;
  facingX: number;
}
export interface SnapEnemy extends FrameEnemy {
  readonly def: EnemyDefinition;
  px: number;
  py: number;
}
export interface SnapProjectile extends FrameProjectile {
  px: number;
  py: number;
}
export interface SnapHostile extends FrameHostile {
  px: number;
  py: number;
}

/** A decoded snapshot. Every entity starts with `px`/`py` at its own position; the replica links them up. */
export interface Snapshot {
  readonly time: number;
  readonly phase: RunPhase;
  readonly players: SnapPlayer[];
  readonly enemies: SnapEnemy[];
  readonly projectiles: SnapProjectile[];
  readonly hostileProjectiles: SnapHostile[];
  readonly pickups: FramePickup[];
  readonly hazards: FrameHazard[];
  /** The boss's enemy ID, or 0. */
  readonly bossId: number;
  /** Realms cleared: a deeper snapshot means the party has passed a gate (spec: endless-run). */
  readonly depth: number;
  /** The host is waiting for every member to load (the start, or a new realm). */
  readonly waiting: boolean;
  readonly gate: { x: number; y: number; radius: number; standing: number } | undefined;
  readonly companions: SnapCompanion[];
  readonly walls: FrameWall[];
  readonly zones: Zone[];
  readonly merchant: { x: number; y: number; radius: number; leavesIn: number } | undefined;
  /** The Director's markers and an eclipse's darkness (spec: director-of-chaos / rooms). */
  readonly sites: FrameSite[];
  readonly darkness: number;
}

export interface SnapCompanion extends FrameCompanion {
  px: number;
  py: number;
}

const FLAG = {
  alive: 1,
  moving: 2,
  dead: 1,
  elite: 2,
  boss: 4,
  windup: 8,
  hit: 16,
  stun: 32,
  burn: 64,
  shock: 128,
  slow: 256,
  left: 512,
  // Boss mechanics (spec: boss-encounter / signature mechanics).
  guarded: 1024,
  marked: 2048,
  dazed: 4096,
  enraged: 8192,
  exposed: 16384,
  // A hunter or champion of the Director (spec: director-of-chaos).
  champion: 32768,
  orbit: 1,
  // A player who left the room.
  gone: 4,
} as const;

const HEADER = { waiting: 1, gate: 2, merchant: 4 } as const;
const HAZARD_SHAPES = ['circle', 'line', 'cone'] as const;
/** A hazard's kind byte: its shape, and whether it raises a wall. */
const HAZARD_WALL = 4;

/**
 * The host's world as guests see it (D16, design: Snapshot): a compact binary picture of everything the views draw,
 * sent 20 times a second. Positions are 16-bit at a quarter pixel, IDs 32-bit (the ID counter is shared with
 * projectiles), and names go through a per-snapshot string table.
 */
export function encodeSnapshot(state: RunState, phase: RunPhase, waiting = false): ArrayBuffer {
  const names = new Map<string, number>();
  const name = (s: string) => {
    let i = names.get(s);
    if (i === undefined) names.set(s, (i = names.size));
    return i;
  };
  // Names first: the table precedes the entities.
  for (const p of state.players) name(p.god.id);
  for (const e of state.enemies) name(e.def.id);
  for (const p of state.projectiles) name(p.sprite);
  for (const h of state.hostileProjectiles) name(h.sprite);
  for (const c of state.companions) name(c.def.id);

  const w = new Writer();
  w.u8(SNAPSHOT_FORMAT);
  w.u8(PHASES.indexOf(phase));
  w.f64(state.time);
  w.u32(state.boss && !state.boss.dead ? state.boss.id : 0);
  w.u16(state.depth);
  const gate = state.gate;
  const merchant = state.merchant;
  w.u8(
    (waiting ? HEADER.waiting : 0) | (gate ? HEADER.gate : 0) | (merchant ? HEADER.merchant : 0),
  );
  if (gate) {
    w.f32(gate.x);
    w.f32(gate.y);
    w.f32(gate.radius);
    w.f32(gate.standing);
  }
  if (merchant) {
    w.f32(merchant.x);
    w.f32(merchant.y);
    w.f32(merchant.radius);
    w.f32(merchant.leavesIn);
  }
  w.u8(Math.round(Math.max(0, Math.min(1, state.omen.darkness)) * 255));
  w.u8(names.size);
  for (const s of names.keys()) w.str(s);

  const staminaMax = state.balance.stamina.max;
  w.u16(state.players.length);
  for (const p of state.players) {
    w.u32(p.id);
    w.pos(p.x);
    w.pos(p.y);
    w.u8(name(p.god.id));
    w.u16(Math.round(p.radius * RADIUS));
    w.f32(p.stats.moveSpeed);
    w.u8((p.alive ? FLAG.alive : 0) | (p.moving ? FLAG.moving : 0) | (p.left ? FLAG.gone : 0));
    w.i8(Math.round(p.facingX * 127));
    w.u8(timer(p.hurtFlash));
    w.u8(timer(p.invulnerable));
    w.u8(Math.round(Math.max(0, Math.min(1, p.revive)) * 255));
    w.u8(Math.round(Math.max(0, Math.min(1, p.stamina / staminaMax)) * 255));
  }

  w.u16(state.enemies.length);
  for (const e of state.enemies) {
    const s = e.status;
    w.u32(e.id);
    w.u8(name(e.def.id));
    w.pos(e.x);
    w.pos(e.y);
    w.u16(Math.round(e.radius * RADIUS));
    w.u16(
      (e.dead ? FLAG.dead : 0) |
        (e.elite ? FLAG.elite : 0) |
        (e.boss ? FLAG.boss : 0) |
        (e.mode === 'windup' ? FLAG.windup : 0) |
        (e.hitFlash > 0 ? FLAG.hit : 0) |
        (s.stun > 0 ? FLAG.stun : 0) |
        (s.burn > 0 ? FLAG.burn : 0) |
        (s.shock > 0 ? FLAG.shock : 0) |
        (s.slow > 0 ? FLAG.slow : 0) |
        (e.facing < 0 ? FLAG.left : 0) |
        (e.guarded ? FLAG.guarded : 0) |
        (e.marked !== undefined ? FLAG.marked : 0) |
        ((e.dazed ?? 0) > 0 ? FLAG.dazed : 0) |
        (e.boss?.enraged ? FLAG.enraged : 0) |
        ((e.boss?.exposed ?? 0) > 0 ? FLAG.exposed : 0) |
        (e.champion ? FLAG.champion : 0),
    );
    w.u8(Math.round(Math.max(0, Math.min(1, e.health / e.maxHealth)) * 255));
    w.i8(Math.round(e.dirX * 127));
    w.i8(Math.round(e.dirY * 127));
    if (e.marked !== undefined) w.u8(e.marked);
  }

  w.u16(state.projectiles.length);
  for (const p of state.projectiles) {
    w.u32(p.id);
    w.u8(name(p.sprite));
    w.pos(p.x);
    w.pos(p.y);
    w.u8(angle(p.vx, p.vy));
    w.u8(ELEMENTS.indexOf(p.source.element));
    w.u8(p.orbit ? FLAG.orbit : 0);
  }

  w.u16(state.hostileProjectiles.length);
  for (const h of state.hostileProjectiles) {
    w.u32(h.id);
    w.u8(name(h.sprite));
    w.pos(h.x);
    w.pos(h.y);
    w.u8(angle(h.vx, h.vy));
  }

  w.u16(state.pickups.length);
  for (const p of state.pickups) {
    w.u32(p.id);
    w.u8(PICKUPS.indexOf(p.kind));
    w.pos(p.x);
    w.pos(p.y);
    w.u16(Math.min(65535, Math.round(p.value)));
  }

  w.u16(state.hazards.length);
  for (const h of state.hazards) {
    w.u8(HAZARD_SHAPES.indexOf(h.shape) | (h.wall !== undefined ? HAZARD_WALL : 0));
    w.f32(h.x);
    w.f32(h.y);
    w.f32(h.x2);
    w.f32(h.y2);
    w.f32(h.radius);
    w.f32(h.width);
    if (h.shape === 'cone') {
      w.f32(h.angle ?? 0);
      w.f32(h.arc ?? 0);
    }
    w.u8(Math.round(Math.max(0, Math.min(1, 1 - Math.max(0, h.timer) / h.warn)) * 255));
    // The seconds left too (to the hundredth, up to 2.55 s): warnings flash in their last quarter-second.
    w.u8(timer(h.timer));
  }

  w.u16(state.walls.length);
  for (const wall of state.walls) {
    w.u32(wall.id);
    w.pos(wall.x);
    w.pos(wall.y);
    w.u16(Math.round(wall.radius * RADIUS));
    w.u8(timer(wall.age));
    w.u8(timer(wall.left));
  }

  w.u8(state.zones.length);
  for (const z of state.zones) {
    w.pos(z.x);
    w.pos(z.y);
    w.u16(Math.round(z.radius * RADIUS));
    w.u8(Math.round(z.slow * 255));
  }

  w.u16(state.companions.length);
  for (const c of state.companions) {
    w.u32(c.id);
    w.u32(c.ownerId);
    w.u8(name(c.def.id));
    w.pos(c.x);
    w.pos(c.y);
    w.i8(Math.round(c.facingX * 127));
    w.u8(c.moving ? FLAG.moving : 0);
  }

  w.u8(state.sites.length);
  for (const s of state.sites) {
    w.u32(s.id);
    w.u8(SITES.indexOf(s.kind));
    w.pos(s.x);
    w.pos(s.y);
    w.u16(Math.round(s.radius * RADIUS));
    w.u16(Math.round(Math.max(0, s.left) * LONG_TIMER));
    w.u16(Math.round(Math.max(0, s.total) * LONG_TIMER));
  }
  return w.finish();
}

/** Decodes a snapshot; enemy and god IDs are resolved against the same content as the host's. */
export function decodeSnapshot(buffer: ArrayBuffer, index: ContentIndex): Snapshot {
  const r = new Reader(buffer);
  const format = r.u8();
  if (format !== SNAPSHOT_FORMAT) throw new Error(`Unknown snapshot format ${format}`);
  const phase = PHASES[r.u8()] ?? 'playing';
  const time = r.f64();
  const bossId = r.u32();
  const depth = r.u16();
  const header = r.u8();
  const gate =
    header & HEADER.gate
      ? { x: r.f32(), y: r.f32(), radius: r.f32(), standing: r.f32() }
      : undefined;
  const merchant =
    header & HEADER.merchant
      ? { x: r.f32(), y: r.f32(), radius: r.f32(), leavesIn: r.f32() }
      : undefined;
  const darkness = r.u8() / 255;
  const names: string[] = [];
  for (let n = r.u8(); n > 0; n--) names.push(r.str());

  const players: SnapPlayer[] = [];
  for (let n = r.u16(); n > 0; n--) {
    const id = r.u32();
    const x = r.pos();
    const y = r.pos();
    const god = index.god(names[r.u8()]);
    const radius = r.u16() / RADIUS;
    const moveSpeed = r.f32();
    const flags = r.u8();
    players.push({
      id,
      x,
      y,
      px: x,
      py: y,
      god,
      radius,
      moveSpeed,
      alive: (flags & FLAG.alive) !== 0,
      moving: (flags & FLAG.moving) !== 0,
      left: (flags & FLAG.gone) !== 0 || undefined,
      facingX: r.i8() / 127,
      hurtFlash: r.u8() / TIMER,
      invulnerable: r.u8() / TIMER,
      revive: r.u8() / 255,
      stamina: (r.u8() / 255) * index.content.balance.stamina.max,
    });
  }

  const enemies: SnapEnemy[] = [];
  const bosses = new Map<string, EnemyDefinition>();
  // The boss walks as an enemy made from its boss definition (bosses/boss.ts).
  const enemyDef = (id: string, boss: boolean): EnemyDefinition => {
    if (!boss) return index.enemy(id);
    let def = bosses.get(id);
    if (!def) bosses.set(id, (def = bossAsEnemy(index.boss(id))));
    return def;
  };
  for (let n = r.u16(); n > 0; n--) {
    const id = r.u32();
    const defId = names[r.u8()];
    const x = r.pos();
    const y = r.pos();
    const radius = r.u16() / RADIUS;
    const flags = r.u16();
    const on = (bit: number) => ((flags & bit) !== 0 ? 1 : 0);
    enemies.push({
      id,
      def: enemyDef(defId, on(FLAG.boss) === 1),
      x,
      y,
      px: x,
      py: y,
      radius,
      dead: on(FLAG.dead) === 1,
      elite: on(FLAG.elite) === 1,
      boss: on(FLAG.boss)
        ? { enraged: on(FLAG.enraged) === 1, exposed: on(FLAG.exposed) ? 1 : 0 }
        : undefined,
      guarded: on(FLAG.guarded) === 1 || undefined,
      dazed: on(FLAG.dazed) ? 1 : undefined,
      champion: on(FLAG.champion) === 1 || undefined,
      mode: on(FLAG.windup) ? 'windup' : 'move',
      hitFlash: on(FLAG.hit),
      status: {
        stun: on(FLAG.stun),
        burn: on(FLAG.burn),
        shock: on(FLAG.shock),
        slow: on(FLAG.slow),
      },
      facing: on(FLAG.left) ? -1 : 1,
      health: r.u8() / 255,
      maxHealth: 1,
      dirX: r.i8() / 127,
      dirY: r.i8() / 127,
      marked: on(FLAG.marked) ? r.u8() : undefined,
    });
  }

  const projectiles: SnapProjectile[] = [];
  for (let n = r.u16(); n > 0; n--) {
    const id = r.u32();
    const sprite = names[r.u8()];
    const x = r.pos();
    const y = r.pos();
    const a = r.angle();
    const element: Element = ELEMENTS[r.u8()] ?? 'physical';
    const orbit = (r.u8() & FLAG.orbit) !== 0;
    projectiles.push({
      id,
      sprite,
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(a),
      vy: Math.sin(a),
      orbit: orbit || undefined,
      source: { element },
    });
  }

  const hostileProjectiles: SnapHostile[] = [];
  for (let n = r.u16(); n > 0; n--) {
    const id = r.u32();
    const sprite = names[r.u8()];
    const x = r.pos();
    const y = r.pos();
    const a = r.angle();
    hostileProjectiles.push({ id, sprite, x, y, px: x, py: y, vx: Math.cos(a), vy: Math.sin(a) });
  }

  const pickups: FramePickup[] = [];
  for (let n = r.u16(); n > 0; n--) {
    const id = r.u32();
    const kind = PICKUPS[r.u8()] ?? 'xp';
    pickups.push({ id, kind, x: r.pos(), y: r.pos(), value: r.u16() });
  }

  const hazards: FrameHazard[] = [];
  for (let n = r.u16(); n > 0; n--) {
    const kind = r.u8();
    const shape = HAZARD_SHAPES[kind & 3] ?? 'circle';
    const x = r.f32();
    const y = r.f32();
    const x2 = r.f32();
    const y2 = r.f32();
    const radius = r.f32();
    const width = r.f32();
    const cone = shape === 'cone' ? { angle: r.f32(), arc: r.f32() } : {};
    const progress = r.u8() / 255;
    const left = r.u8() / TIMER;
    // Drawn as progress = 1 − timer / warn, with the true seconds left.
    const warn = progress < 1 ? left / (1 - progress) : 1;
    hazards.push({
      shape,
      x,
      y,
      x2,
      y2,
      radius,
      width,
      ...cone,
      wall: kind & HAZARD_WALL ? 1 : undefined,
      warn: warn > 0 ? warn : 1,
      timer: left,
    });
  }

  const walls: FrameWall[] = [];
  for (let n = r.u16(); n > 0; n--)
    walls.push({
      id: r.u32(),
      x: r.pos(),
      y: r.pos(),
      radius: r.u16() / RADIUS,
      age: r.u8() / TIMER,
      left: r.u8() / TIMER,
    });

  const zones: Zone[] = [];
  for (let n = r.u8(); n > 0; n--) {
    const x = r.pos();
    const y = r.pos();
    const radius = r.u16() / RADIUS;
    zones.push({ x, y, radius, dps: 0, slow: r.u8() / 255 });
  }

  const companions: SnapCompanion[] = [];
  for (let n = r.u16(); n > 0; n--) {
    const id = r.u32();
    const ownerId = r.u32();
    const def = index.companions.get(names[r.u8()]);
    const x = r.pos();
    const y = r.pos();
    const facingX = r.i8() / 127;
    const moving = (r.u8() & FLAG.moving) !== 0;
    if (def) companions.push({ id, ownerId, def, x, y, px: x, py: y, facingX, moving });
  }

  const sites: FrameSite[] = [];
  for (let n = r.u8(); n > 0; n--)
    sites.push({
      id: r.u32(),
      kind: SITES[r.u8()] ?? 'rift',
      x: r.pos(),
      y: r.pos(),
      radius: r.u16() / RADIUS,
      left: r.u16() / LONG_TIMER,
      total: r.u16() / LONG_TIMER,
    });

  return {
    sites,
    darkness,
    companions,
    merchant,
    walls,
    zones,
    time,
    phase,
    players,
    enemies,
    projectiles,
    hostileProjectiles,
    pickups,
    hazards,
    bossId,
    depth,
    waiting: (header & HEADER.waiting) !== 0,
    gate,
  };
}

function timer(seconds: number): number {
  return Math.round(Math.max(0, Math.min(255, seconds * TIMER)));
}

/** A direction as one byte (1.4° steps). */
function angle(vx: number, vy: number): number {
  const a = Math.atan2(vy, vx);
  return Math.round(((a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2)) * 256) & 255;
}

class Writer {
  private buffer = new ArrayBuffer(4096);
  private view = new DataView(this.buffer);
  private bytes = new Uint8Array(this.buffer);
  private at = 0;
  private static readonly text = new TextEncoder();

  u8(v: number): void {
    this.room(1);
    this.view.setUint8(this.at, v);
    this.at += 1;
  }
  i8(v: number): void {
    this.room(1);
    this.view.setInt8(this.at, Math.max(-127, Math.min(127, v)));
    this.at += 1;
  }
  u16(v: number): void {
    this.room(2);
    this.view.setUint16(this.at, Math.max(0, Math.min(65535, v)), true);
    this.at += 2;
  }
  u32(v: number): void {
    this.room(4);
    this.view.setUint32(this.at, v, true);
    this.at += 4;
  }
  f32(v: number): void {
    this.room(4);
    this.view.setFloat32(this.at, v, true);
    this.at += 4;
  }
  f64(v: number): void {
    this.room(8);
    this.view.setFloat64(this.at, v, true);
    this.at += 8;
  }
  pos(v: number): void {
    this.room(2);
    this.view.setInt16(this.at, Math.max(-32767, Math.min(32767, Math.round(v * POS))), true);
    this.at += 2;
  }
  str(s: string): void {
    const encoded = Writer.text.encode(s);
    this.u8(encoded.length);
    this.room(encoded.length);
    this.bytes.set(encoded, this.at);
    this.at += encoded.length;
  }
  finish(): ArrayBuffer {
    return this.buffer.slice(0, this.at);
  }
  private room(n: number): void {
    if (this.at + n <= this.buffer.byteLength) return;
    const next = new ArrayBuffer(Math.max(this.buffer.byteLength * 2, this.at + n));
    new Uint8Array(next).set(this.bytes);
    this.buffer = next;
    this.view = new DataView(next);
    this.bytes = new Uint8Array(next);
  }
}

class Reader {
  private readonly view: DataView;
  private at = 0;
  private static readonly text = new TextDecoder();

  constructor(private readonly buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }
  u8(): number {
    return this.view.getUint8(this.at++);
  }
  i8(): number {
    return this.view.getInt8(this.at++);
  }
  u16(): number {
    const v = this.view.getUint16(this.at, true);
    this.at += 2;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.at, true);
    this.at += 4;
    return v;
  }
  f32(): number {
    const v = this.view.getFloat32(this.at, true);
    this.at += 4;
    return v;
  }
  f64(): number {
    const v = this.view.getFloat64(this.at, true);
    this.at += 8;
    return v;
  }
  pos(): number {
    const v = this.view.getInt16(this.at, true) / POS;
    this.at += 2;
    return v;
  }
  angle(): number {
    return (this.u8() / 256) * Math.PI * 2;
  }
  str(): string {
    const n = this.u8();
    const s = Reader.text.decode(new Uint8Array(this.buffer, this.at, n));
    this.at += n;
    return s;
  }
}
