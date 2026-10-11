import { ContentIndex } from '../data/content-index';
import { RealmDefinition } from '../data/types';
import { ArenaData } from '../maps/generate-arena';
import { DebugAction, RunSimulation, STEP } from '../sim/run-simulation';
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
  readonly players: number;
  readonly party: readonly { readonly x: number; readonly y: number; readonly alive: boolean }[];
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
  /** The local player's ID. */
  readonly localId: number;
  /** A room's run: the pause menu does not stop it (spec: rooms / pausing in a room). */
  readonly shared: boolean;
  /** The local pause menu is open. */
  readonly paused: boolean;
  /** The run has begun: in a room, once every member has loaded (host) or the host's first frame came (guest). */
  readonly started: boolean;
  /** Members loaded so far, 0–1 (rooms; 1 otherwise). */
  readonly partyProgress: number;
  /** The local scene is built and ready to play. */
  markLoaded(): void;
  /** Advances by `dt` real seconds; `afterStep` runs after every fixed step (it clears input taps). */
  advance(dt: number, input: PlayerInput, afterStep: () => void): void;
  /** Events for this player's screen since the last call: feedback, own choices and own result. */
  events(): SimEvent[];
  hud(): HudSnapshot | undefined;
  /** The point the camera follows: the local god, or a living ally once it has fallen. */
  focus(): { x: number; y: number };
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

  constructor(
    readonly sim: RunSimulation,
    private readonly room?: RoomHost,
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

  advance(dt: number, input: PlayerInput, afterStep: () => void): void {
    const sim = this.sim;
    this.room?.receive(dt);
    if (this.started && sim.phase === 'playing') {
      this.accumulator += dt;
      while (this.accumulator >= STEP && sim.phase === 'playing') {
        // With the menu open in a room, the run goes on without this player's input.
        const own = this.menuOpen ? NO_INPUT : input;
        sim.step(STEP, this.room ? this.room.inputs(own) : [own]);
        this.accumulator -= STEP;
        afterStep();
      }
    } else {
      this.accumulator = 0;
    }
    this.drain();
    if (this.started) this.room?.tick(dt);
  }

  /** Sends the simulation's events to the guests and keeps the local player's own for this screen. */
  private drain(): void {
    const events = this.sim.events();
    this.room?.forward(events);
    const me = this.localId;
    for (const e of events) {
      // Other players' choices are theirs alone (spec: rooms / choices in a room).
      if (e.type === 'choice' && e.choice.playerId !== me) continue;
      if (e.type === 'choiceResolved' && e.playerId !== me) continue;
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
    return focusOf(this.sim.state.players, this.localId, this.alpha);
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
    // Only the local player's own choice is answered here; guests answer theirs through the room.
    if (this.sim.choiceFor(this.localId)?.id === choiceId) this.sim.choose(index, choiceId);
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
      players: state.players.filter((pl) => !pl.left).length,
      party: state.players.map((pl) => ({ x: pl.x, y: pl.y, alive: pl.alive })),
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
