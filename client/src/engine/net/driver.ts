import { ContentIndex } from '../data/content-index';
import { RealmDefinition } from '../data/types';
import { ArenaData } from '../maps/generate-arena';
import { DebugAction, RunSimulation, STEP } from '../sim/run-simulation';
import { partyFrame } from '../sim/shared-screen';
import { HudSnapshot, NO_INPUT, PlayerInput, RunPhase, SimEvent } from '../sim/types';
import { WorldFrame } from '../sim/world-frame';
import { RoomHost } from './host';

/** Positions and counters for end-to-end tests (debug sessions). */
export interface DriverSnapshot {
  readonly phase: string;
  readonly time: number;
  readonly player: { readonly x: number; readonly y: number; readonly health: number };
  readonly enemies: number;
  readonly bossAlive: boolean;
  /** Where the living boss is (local runs only), so scripts can wait for it to come into view. */
  readonly boss?: { readonly x: number; readonly y: number };
  /** Where the merchant stands while it is in the realm. */
  readonly merchant?: { readonly x: number; readonly y: number };
  readonly players: number;
  readonly party: readonly { readonly x: number; readonly y: number; readonly alive: boolean }[];
  readonly depth: number;
}

/**
 * Where a scene's run comes from (D16, design: Layers): the local simulation (solo, or a room's host), or the host's
 * world replayed on a guest. The scene reads input, calls `advance`, draws `world` and presents `events`; it holds
 * no gameplay rules and no simulation of its own.
 */
export interface RunDriver {
  readonly index: ContentIndex;
  readonly realm: RealmDefinition;
  readonly arena: ArenaData;
  readonly world: WorldFrame;
  /** Interpolation between every entity's previous and current position. */
  readonly alpha: number;
  readonly phase: RunPhase;
  /** The local player's ID (player 1 on a shared screen). */
  readonly localId: number;
  /** Every player at this screen, in seat order (several on a shared screen, spec: co-op / local co-op). */
  readonly localIds: readonly number[];
  /** A room's run: the pause menu does not stop it (spec: rooms / pausing in a room). */
  readonly shared: boolean;
  /** The local pause menu is open. */
  readonly paused: boolean;
  /** The run has begun: in a room, once every member has loaded (host) or the host's first frame came (guest). */
  readonly started: boolean;
  /** Members loaded so far, 0–1 (rooms; 1 otherwise). */
  readonly partyProgress: number;
  /** The local scene is built and ready to play (again after every gate, spec: endless-run). */
  markLoaded(): void;
  /**
   * Advances by `dt` real seconds with the input of every local player in seat order; `afterStep` runs after every
   * fixed step (it clears input taps).
   */
  advance(dt: number, inputs: readonly PlayerInput[], afterStep: () => void): void;
  /** Events for this screen since the last call: feedback, its players' own choices and the result. */
  events(): SimEvent[];
  hud(): HudSnapshot | undefined;
  /** The point the camera follows: the local god, or a living ally once it has fallen. */
  focus(): { x: number; y: number };
  /** How far apart the living local gods are (0 with one); the camera zooms out to frame them. */
  spread(): { x: number; y: number };
  pause(): boolean;
  resume(): boolean;
  choose(choiceId: number, index: number): void;
  /** Solo or host: abandons the run (for everyone). Guest: leaves the room. */
  abandon(): void;
  setView(halfWidth: number, halfHeight: number): void;
  debug(action: DebugAction): void;
  inspect(): DriverSnapshot;
  destroy(): void;
}

/** The local simulation: a solo run, or the authoritative run of a room's host (with `room`). */
export class LocalDriver implements RunDriver {
  private accumulator = 0;
  private menuOpen = false;
  private pending: SimEvent[] = [];
  private loaded = false;

  /** The first `locals` seats play at this screen (spec: co-op / local co-op on one screen). */
  constructor(
    readonly sim: RunSimulation,
    private readonly room?: RoomHost,
    private readonly locals = 1,
  ) {}

  get index(): ContentIndex {
    return this.sim.state.index;
  }
  get realm(): RealmDefinition {
    return this.sim.state.realm;
  }
  get arena(): ArenaData {
    return this.sim.arena;
  }
  get world(): WorldFrame {
    return this.sim.state;
  }
  get alpha(): number {
    return this.sim.phase === 'playing' ? this.accumulator / STEP : 1;
  }
  get phase(): RunPhase {
    return this.sim.phase;
  }
  get localId(): number {
    return this.sim.state.players[0].id;
  }
  get localIds(): readonly number[] {
    return this.sim.state.players.slice(0, this.locals).map((p) => p.id);
  }
  get shared(): boolean {
    return !!this.room;
  }
  get paused(): boolean {
    return this.room ? this.menuOpen : this.sim.phase === 'paused';
  }
  get started(): boolean {
    return this.loaded && (this.room?.everyoneLoaded ?? true);
  }
  get partyProgress(): number {
    return this.room?.loadedFraction ?? 1;
  }

  markLoaded(): void {
    this.loaded = true;
  }

  advance(dt: number, inputs: readonly PlayerInput[], afterStep: () => void): void {
    const sim = this.sim;
    this.room?.receive(dt);
    if (this.started && sim.phase === 'playing') {
      this.accumulator += dt;
      while (this.accumulator >= STEP && sim.phase === 'playing') {
        // With the menu open in a room, the run goes on without this player's input.
        const own = this.menuOpen ? NO_INPUT : (inputs[0] ?? NO_INPUT);
        sim.step(STEP, this.room ? this.room.inputs(own) : inputs);
        this.accumulator -= STEP;
        afterStep();
      }
    } else {
      this.accumulator = 0;
    }
    this.drain();
    // Guests get the world as soon as this scene is ready; until everyone is, frames say "waiting".
    if (this.loaded) this.room?.tick(dt, !this.started);
  }

  /** Sends the simulation's events to the guests and keeps the local player's own for this screen. */
  private drain(): void {
    const events = this.sim.events();
    this.room?.forward(events);
    const mine = this.localIds;
    for (const e of events) {
      // A new realm: this scene rebuilds it, and the run waits until everyone has (spec: endless-run).
      if (e.type === 'realmEntered') {
        this.loaded = false;
        this.accumulator = 0;
        this.room?.newRealm();
      }
      // Other players' choices are theirs alone (spec: rooms / choices in a room).
      if (e.type === 'choice' && !mine.includes(e.choice.playerId)) continue;
      if (e.type === 'choiceResolved' && !mine.includes(e.playerId)) continue;
      this.pending.push(e);
    }
  }

  events(): SimEvent[] {
    return this.pending.splice(0);
  }

  hud(): HudSnapshot {
    return this.sim.hud(this.localId);
  }

  focus(): { x: number; y: number } {
    const gods = this.livingLocals();
    if (gods.length < 2) return focusOf(this.sim.state.players, this.localId, this.alpha);
    const { x, y } = partyFrame(gods, this.alpha);
    return { x, y };
  }

  spread(): { x: number; y: number } {
    const gods = this.livingLocals();
    if (gods.length < 2) return { x: 0, y: 0 };
    const frame = partyFrame(gods, this.alpha);
    return { x: frame.spreadX, y: frame.spreadY };
  }

  /** The living gods played at this screen. */
  private livingLocals() {
    return this.sim.state.players.slice(0, this.locals).filter((p) => p.alive && !p.left);
  }

  pause(): boolean {
    if (!this.room) return this.sim.pause();
    if (this.menuOpen || this.sim.phase === 'ended') return false;
    this.menuOpen = true;
    return true;
  }

  resume(): boolean {
    if (!this.room) return this.sim.resume();
    if (!this.menuOpen) return false;
    this.menuOpen = false;
    return true;
  }

  choose(choiceId: number, index: number): void {
    // Only the choices of the players at this screen are answered here; guests answer theirs through the room.
    if (this.localIds.some((id) => this.sim.choiceFor(id)?.id === choiceId))
      this.sim.choose(index, choiceId);
  }

  abandon(): void {
    this.sim.abandon();
    // Tell the guests at once, even if no frame follows.
    this.drain();
  }

  setView(halfWidth: number, halfHeight: number): void {
    this.sim.setView(halfWidth, halfHeight);
  }

  debug(action: DebugAction): void {
    this.sim.debug(action);
  }

  inspect(): DriverSnapshot {
    const state = this.sim.state;
    const p = state.players[0];
    return {
      phase: this.sim.phase,
      time: state.time,
      player: { x: p.x, y: p.y, health: p.health },
      enemies: state.enemies.length,
      bossAlive: !!state.boss && !state.boss.dead,
      boss: state.boss && !state.boss.dead ? { x: state.boss.x, y: state.boss.y } : undefined,
      merchant: state.merchant ? { x: state.merchant.x, y: state.merchant.y } : undefined,
      players: state.players.filter((pl) => !pl.left).length,
      party: state.players.map((pl) => ({ x: pl.x, y: pl.y, alive: pl.alive })),
      depth: state.depth,
    };
  }

  destroy(): void {
    this.room?.close();
  }
}

/** The local god while it lives, else the first living ally, else where the local god fell. */
export function focusOf(
  players: readonly {
    readonly id: number;
    readonly alive: boolean;
    readonly x: number;
    readonly y: number;
    readonly px: number;
    readonly py: number;
  }[],
  localId: number,
  alpha: number,
): { x: number; y: number } {
  const me = players.find((p) => p.id === localId);
  const target = me?.alive ? me : (players.find((p) => p.alive) ?? me ?? players[0]);
  if (!target) return { x: 0, y: 0 };
  return {
    x: target.px + (target.x - target.px) * alpha,
    y: target.py + (target.y - target.py) * alpha,
  };
}
