import { WorldCollision } from '../core/collision';
import { ContentIndex } from '../data/content-index';
import { RealmDefinition } from '../data/types';
import { ArenaData, generateArena } from '../maps/generate-arena';
import { Mover, stepMovement } from '../sim/movement';
import { DebugAction } from '../sim/run-simulation';
import { realmAt, realmSeed } from '../sim/realms';
import { partyOf, RunConfig, STEP } from '../sim/run-state';
import { HudSnapshot, NO_INPUT, PlayerInput, RunPhase, RunResult, SimEvent } from '../sim/types';
import { FrameHazard, FramePickup, WorldFrame } from '../sim/world-frame';
import { DriverSnapshot, focusOf, RunDriver } from './driver';
import { PeerLink } from './link';
import { GuestMessage, isHostMessage } from './protocol';
import {
  decodeSnapshot,
  SnapCompanion,
  SnapEnemy,
  SnapHostile,
  SnapPlayer,
  SnapProjectile,
  Snapshot,
} from './snapshot';

/** The world is drawn this far behind the newest snapshot, so there is always a next one to move toward. */
export const INTERPOLATION_DELAY = 0.1;
/** Further off than this, the drawn time jumps instead of easing. */
const MAX_DRIFT = 0.25;
/** A prediction this far from the host's position jumps instead of easing (knockback, a revival). */
const SNAP_DISTANCE = 64;
/** Share of the remaining visual correction kept per frame. */
const CORRECTION_DECAY = 0.85;

interface BufferedFrame {
  snap: Snapshot;
  events: SimEvent[];
  released: boolean;
}

interface Predicted extends Mover {
  active: boolean;
  px: number;
  py: number;
  /** Visual correction still being eased out. */
  ox: number;
  oy: number;
}

/** A mutable `WorldFrame` rebuilt from two snapshots. */
interface ReplicaFrame {
  players: SnapPlayer[];
  enemies: SnapEnemy[];
  projectiles: SnapProjectile[];
  hostileProjectiles: SnapHostile[];
  pickups: (FramePickup & { x: number; y: number })[];
  hazards: FrameHazard[];
  boss: { x: number; y: number; dead: boolean } | undefined;
  gate: Snapshot['gate'];
  companions: SnapCompanion[];
  merchant: Snapshot['merchant'];
  walls: Snapshot['walls'];
  zones: Snapshot['zones'];
  sites: Snapshot['sites'];
  darkness: number;
  depth: number;
  span: number;
}

/**
 * A guest's side of a room's run (D16, design: Guest): sends the local input to the host, draws the host's world
 * between the two snapshots around a time slightly in the past, predicts the guest's own movement so it responds
 * at once, and presents the guest's own choices, HUD and result. No gameplay rules run here.
 */
export class GuestDriver implements RunDriver {
  realm: RealmDefinition;
  arena: ArenaData;
  readonly shared = true;
  private collision: WorldCollision;
  /** Realms cleared, as far as this guest has followed the host (spec: endless-run). */
  private depth = 0;
  private readonly inbox: unknown[] = [];
  private frames: BufferedFrame[] = [];
  private pair: [BufferedFrame, BufferedFrame] | undefined;
  private frame: ReplicaFrame = {
    players: [],
    enemies: [],
    projectiles: [],
    hostileProjectiles: [],
    pickups: [],
    hazards: [],
    boss: undefined,
    gate: undefined,
    companions: [],
    merchant: undefined,
    walls: [],
    zones: [],
    sites: [],
    darkness: 0,
    depth: 0,
    span: STEP,
  };
  /** Pickup positions in the older and newer snapshot: [ax, ay, bx, by] per pickup. */
  private pickupPath: number[] = [];
  private renderTime = -1;
  private interpolation = 1;
  private accumulator = 0;
  private seq = 0;
  private history: { seq: number; x: number; y: number; stamina: number }[] = [];
  private readonly me: Predicted = {
    active: false,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    radius: 0,
    moving: false,
    facingX: 1,
    facingY: 0,
    stamina: 0,
    staminaRest: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashX: 1,
    dashY: 0,
    ox: 0,
    oy: 0,
  };
  private moveSpeed = 0;
  private latestHud: HudSnapshot | undefined;
  private latestResult: RunResult | undefined;
  private pending: SimEvent[] = [];
  private menuOpen = false;
  private ended = false;
  private hostGone = false;
  /** The deepest realm this guest has told the host it loaded. */
  private loadedDepth = -1;
  private player = -1;

  constructor(
    readonly index: ContentIndex,
    private readonly run: RunConfig,
    private readonly slot: number,
    private readonly link: PeerLink,
  ) {
    this.realm = index.realm(run.realmId);
    // The same generator and seed as the host's: the same arena (design: guests rebuild the arena).
    this.arena = generateArena(this.realm.map, run.seed);
    this.collision = new WorldCollision(this.arena.bounds, this.arena.obstacles);
    link.onMessage((m) => this.inbox.push(m));
    link.onClose(() => (this.hostGone = true));
  }

  get world(): WorldFrame {
    return this.frame;
  }
  get alpha(): number {
    return this.interpolation;
  }
  get phase(): RunPhase {
    if (this.ended) return 'ended';
    return this.newest?.snap.phase ?? 'playing';
  }
  get localId(): number {
    return this.player;
  }
  get localIds(): readonly number[] {
    return [this.player];
  }
  get paused(): boolean {
    return this.menuOpen;
  }
  /** The host's run is going: it has sent the world and is not waiting for anyone to load. */
  get started(): boolean {
    return this.ended || (!!this.newest && !this.newest.snap.waiting);
  }
  get partyProgress(): number {
    return this.started ? 1 : 0.5;
  }

  private get newest(): BufferedFrame | undefined {
    return this.frames[this.frames.length - 1];
  }

  markLoaded(): void {
    if (this.loadedDepth >= this.depth) return;
    this.loadedDepth = this.depth;
    this.send({ type: 'loaded', depth: this.depth });
  }

  advance(dt: number, inputs: readonly PlayerInput[], afterStep: () => void): void {
    const input = inputs[0] ?? NO_INPUT;
    this.receive();
    if (this.hostGone && !this.ended) this.finish(this.abandonedResult());

    // Own movement: sent to the host and predicted, one fixed step at a time.
    const playing = this.started && !this.ended && this.phase === 'playing';
    if (playing) {
      this.accumulator += dt;
      while (this.accumulator >= STEP) {
        this.accumulator -= STEP;
        this.predictStep(this.menuOpen ? NO_INPUT : input);
        afterStep();
      }
    } else {
      this.accumulator = 0;
    }

    this.interpolate(dt);
    const decay = Math.pow(CORRECTION_DECAY, dt * 60);
    this.me.ox *= decay;
    this.me.oy *= decay;
    this.placeSelf();
  }

  events(): SimEvent[] {
    return this.pending.splice(0);
  }

  hud(): HudSnapshot | undefined {
    return this.latestHud;
  }

  huds(): HudSnapshot[] {
    return this.latestHud ? [this.latestHud] : [];
  }

  focus(): { x: number; y: number } {
    const self = this.frame.players.find((p) => p.id === this.player);
    if (self?.alive && this.me.active) return this.selfPosition();
    return focusOf(this.frame.players, this.player, this.interpolation);
  }

  spread(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  pause(): boolean {
    if (this.menuOpen || this.ended) return false;
    this.menuOpen = true;
    return true;
  }

  resume(): boolean {
    if (!this.menuOpen) return false;
    this.menuOpen = false;
    return true;
  }

  choose(choiceId: number, index: number): void {
    this.send({ type: 'choose', choiceId, index });
  }

  /** Leaves the room: the guest's run ends as abandoned with what they earned (spec: rooms / leaving). */
  abandon(): void {
    if (this.ended) return;
    this.finish(this.abandonedResult());
    this.link.close();
  }

  setView(): void {
    // The host decides where enemies spawn.
  }

  debug(_action: DebugAction): void {
    // Debug commands act on the host's simulation only.
  }

  inspect(): DriverSnapshot {
    const snap = this.newest?.snap;
    const self = this.me.active ? this.selfPosition() : this.focus();
    return {
      phase: this.phase,
      time: snap?.time ?? 0,
      player: { x: self.x, y: self.y, health: this.latestHud?.health ?? 0 },
      enemies: snap?.enemies.length ?? 0,
      bossAlive: !!snap?.bossId,
      merchant: snap?.merchant ? { x: snap.merchant.x, y: snap.merchant.y } : undefined,
      players: snap?.players.length ?? 0,
      party: (snap?.players ?? []).map((p) => ({ x: p.x, y: p.y, alive: p.alive })),
      depth: this.depth,
    };
  }

  destroy(): void {
    this.ended = true;
    this.link.close();
  }

  private send(message: GuestMessage): void {
    if (!this.hostGone) this.link.send(message);
  }

  private receive(): void {
    for (const m of this.inbox.splice(0)) {
      if (!isHostMessage(m)) continue;
      switch (m.type) {
        case 'frame': {
          const snap = decodeSnapshot(m.snapshot, this.index);
          this.player = snap.players[this.slot]?.id ?? this.player;
          if (snap.depth > this.depth) this.enterRealm(snap.depth);
          // This guest announces its own new realm (above); the host's is not for this screen.
          const events = m.events.filter((e) => e.type !== 'realmEntered');
          const last = this.newest;
          // A frozen run (choices open) sends the same moment again: keep the newest picture and every event.
          if (last && last.snap.time === snap.time) {
            last.snap = snap;
            last.events.push(...events);
            last.released = false;
            if (this.pair?.[1] === last) this.pair = undefined;
          } else {
            this.frames.push({ snap, events, released: false });
          }
          this.reconcile(snap, m.ack);
          break;
        }
        case 'hud':
          this.latestHud = m.hud;
          if (m.result) this.latestResult = m.result;
          break;
        case 'choice':
          this.pending.push({ type: 'choice', choice: m.choice });
          break;
        case 'ended':
          if (!this.ended) this.finish(m.result);
          break;
      }
    }
  }

  /**
   * The host's party passed a gate (spec: endless-run): the same next realm and arena as the host's, the old
   * realm's pictures and prediction dropped, and the scene told to rebuild.
   */
  private enterRealm(depth: number): void {
    this.depth = depth;
    this.realm = realmAt(this.index.content.realms, this.run.realmId, depth);
    this.arena = generateArena(this.realm.map, realmSeed(this.run.seed, depth));
    this.collision = new WorldCollision(this.arena.bounds, this.arena.obstacles);
    this.frames = [];
    this.pair = undefined;
    this.renderTime = -1;
    this.history = [];
    this.me.active = false;
    this.pending.push({ type: 'realmEntered', realmId: this.realm.id, depth });
  }

  private finish(result: RunResult): void {
    this.ended = true;
    this.latestResult = result;
    this.pending.push({ type: 'runEnded', result });
  }

  /** The guest's result so far, ended as abandoned (the host left, or the guest did). */
  private abandonedResult(): RunResult {
    const hud = this.latestHud;
    const base: RunResult = this.latestResult ?? {
      runId: this.run.runId,
      godId: partyOf(this.run)[this.slot]?.godId ?? this.run.godId,
      realmId: this.run.realmId,
      seed: this.run.seed,
      variant: this.run.variant,
      eventId: this.run.eventId,
      outcome: 'abandoned',
      timeSeconds: 0,
      level: 1,
      kills: 0,
      gold: 0,
      realmsCleared: 0,
      realmReached: this.run.realmId,
      players: partyOf(this.run).length,
      bots: partyOf(this.run).filter((s) => s.bot).length,
      loadout: { weapons: [], relics: [], skills: [], synergies: [], fusions: [] },
    };
    return {
      ...base,
      outcome: 'abandoned',
      timeSeconds: hud ? Math.floor(hud.time) : base.timeSeconds,
      level: hud?.level ?? base.level,
      kills: hud?.kills ?? base.kills,
      gold: hud?.gold ?? base.gold,
    };
  }

  // -- Prediction (design: Guest / prediction) ---------------------------------------------------------------

  private predictStep(input: PlayerInput): void {
    this.seq++;
    this.send({
      type: 'input',
      seq: this.seq,
      x: input.moveX,
      y: input.moveY,
      ability: input.ability,
      sprint: !!input.sprint,
      dash: !!input.dash,
    });
    const me = this.me;
    if (!me.active) return;
    // The same movement rule as the host's players (sim/movement.ts), against the same obstacles.
    me.px = me.x;
    me.py = me.y;
    // A part's zone slows the god here as it does on the host.
    let speed = this.moveSpeed;
    for (const z of this.frame.zones)
      if ((me.x - z.x) ** 2 + (me.y - z.y) ** 2 <= (z.radius + me.radius) ** 2) {
        speed *= 1 - z.slow;
        break;
      }
    stepMovement(me, input, speed, this.index.content.balance.stamina, this.collision, STEP);
    this.history.push({ seq: this.seq, x: me.x, y: me.y, stamina: me.stamina });
    if (this.history.length > 120) this.history.shift();
  }

  /** Moves the prediction by the host's error at the acknowledged input; the drawn god eases over. */
  private reconcile(snap: Snapshot, ack: number): void {
    const host = snap.players[this.slot];
    const me = this.me;
    if (!host) return;
    this.moveSpeed = host.moveSpeed;
    me.radius = host.radius;
    if (!host.alive) {
      me.active = false;
      this.history = [];
      return;
    }
    if (!me.active) {
      Object.assign(me, {
        active: true,
        x: host.x,
        y: host.y,
        px: host.x,
        py: host.y,
        ox: 0,
        oy: 0,
        stamina: host.stamina,
        dashTime: 0,
      });
      me.facingX = host.facingX;
      this.history = [];
      return;
    }
    const at = this.history.findIndex((h) => h.seq === ack);
    // Before any input was applied, or long gone: compare with the newest prediction only when standing still.
    const base = at >= 0 ? this.history[at] : this.history.length === 0 ? me : undefined;
    if (!base) return;
    const ex = host.x - base.x;
    const ey = host.y - base.y;
    if (at >= 0) this.history.splice(0, at + 1);
    // Stamina is corrected like position, by the host's error at the acknowledged input (finer than the snapshot's
    // rounding is noise).
    const es = host.stamina - base.stamina;
    if (Math.abs(es) > 1) {
      for (const h of this.history) h.stamina += es;
      me.stamina = Math.max(0, me.stamina + es);
    }
    if (ex === 0 && ey === 0) return;
    for (const h of this.history) {
      h.x += ex;
      h.y += ey;
    }
    me.x += ex;
    me.y += ey;
    me.px += ex;
    me.py += ey;
    if (Math.hypot(ex, ey) > SNAP_DISTANCE) {
      me.ox = 0;
      me.oy = 0;
    } else {
      me.ox -= ex;
      me.oy -= ey;
    }
  }

  private selfPosition(): { x: number; y: number } {
    const me = this.me;
    const a = this.accumulator / STEP;
    return { x: me.px + (me.x - me.px) * a + me.ox, y: me.py + (me.y - me.py) * a + me.oy };
  }

  /** Draws the guest's own god where it is predicted, at its predicted speed, whatever the snapshot alpha. */
  private placeSelf(): void {
    const self = this.frame.players.find((p) => p.id === this.player);
    const me = this.me;
    if (!self || !self.alive || !me.active) return;
    const r = this.selfPosition();
    const span = this.frame.span;
    const alpha = this.interpolation;
    // Chosen so that lerp(px, x, alpha) is the predicted position and (x − px) / span its velocity.
    const vx = (me.x - me.px) / STEP;
    const vy = (me.y - me.py) / STEP;
    self.x = r.x + vx * span * (1 - alpha);
    self.y = r.y + vy * span * (1 - alpha);
    self.px = r.x - vx * span * alpha;
    self.py = r.y - vy * span * alpha;
    self.moving = me.moving;
    self.facingX = me.facingX;
  }

  // -- Interpolation (design: Guest / interpolation) ---------------------------------------------------------

  private interpolate(dt: number): void {
    const newest = this.newest;
    if (!newest) return;
    const latest = newest.snap.time;
    const frozen = newest.snap.phase !== 'playing';
    const target = frozen ? latest : latest - INTERPOLATION_DELAY;
    if (this.renderTime < 0) this.renderTime = target;
    if (!frozen) this.renderTime += dt;
    const drift = target - this.renderTime;
    this.renderTime =
      Math.abs(drift) > MAX_DRIFT ? target : this.renderTime + drift * Math.min(1, dt * 6);
    this.renderTime = Math.min(this.renderTime, latest);

    // The two frames around the drawn time; older ones are dropped.
    let i = 0;
    while (i + 1 < this.frames.length && this.frames[i + 1].snap.time <= this.renderTime) i++;
    const a = this.frames[i];
    const b = this.frames[i + 1] ?? a;

    // Events are presented when the drawn world reaches their frame.
    for (const f of this.frames) {
      if (f.released || f.snap.time > this.renderTime + STEP * 3) continue;
      f.released = true;
      this.pending.push(...f.events);
      f.events = [];
    }
    if (i > 0) this.frames.splice(0, i);

    if (!this.pair || this.pair[0] !== a || this.pair[1] !== b) this.rebuild(a.snap, b.snap);
    this.pair = [a, b];
    const gap = b.snap.time - a.snap.time;
    this.interpolation =
      gap > 0 ? Math.max(0, Math.min(1, (this.renderTime - a.snap.time) / gap)) : 1;
    const t = this.interpolation;
    const path = this.pickupPath;
    for (let k = 0; k < this.frame.pickups.length; k++) {
      const pk = this.frame.pickups[k];
      pk.x = path[k * 4] + (path[k * 4 + 2] - path[k * 4]) * t;
      pk.y = path[k * 4 + 1] + (path[k * 4 + 3] - path[k * 4 + 1]) * t;
    }
  }

  /** The replica between snapshots `a` and `b`: everything in `b`, coming from where it was in `a`. */
  private rebuild(a: Snapshot, b: Snapshot): void {
    const from = <T extends { id: number; x: number; y: number }>(
      older: readonly T[],
      newer: T[],
    ): T[] => {
      const byId = new Map<number, T>();
      for (const o of older) byId.set(o.id, o);
      return newer.map((n) => {
        const o = byId.get(n.id);
        // Copies, so the predicted god never writes into a buffered snapshot.
        return { ...n, px: o && o !== n ? o.x : n.x, py: o && o !== n ? o.y : n.y };
      });
    };
    const enemies = from(a.enemies, b.enemies);
    const boss = enemies.find((e) => e.id === b.bossId);
    const olderPickups = new Map(a.pickups.map((p) => [p.id, p]));
    const path: number[] = [];
    const pickups = b.pickups.map((p) => {
      const o = olderPickups.get(p.id) ?? p;
      path.push(o.x, o.y, p.x, p.y);
      return { ...p };
    });
    this.pickupPath = path;
    // The host's shifting walls block the guest's own predicted movement too (spec: boss-encounter).
    this.collision.setDynamic(b.walls);
    this.frame = {
      players: from(a.players, b.players),
      enemies,
      projectiles: from(a.projectiles, b.projectiles),
      hostileProjectiles: from(a.hostileProjectiles, b.hostileProjectiles),
      pickups,
      hazards: b.hazards,
      boss: boss && { x: boss.x, y: boss.y, dead: boss.dead },
      gate: b.gate,
      companions: from(a.companions, b.companions),
      merchant: b.merchant,
      walls: b.walls,
      zones: b.zones,
      sites: b.sites,
      darkness: b.darkness,
      depth: b.depth,
      span: b.time > a.time ? b.time - a.time : STEP,
    };
  }
}
