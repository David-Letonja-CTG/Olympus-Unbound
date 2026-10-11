import { RunSimulation } from '../sim/run-simulation';
import { NO_INPUT, PlayerInput, SimEvent } from '../sim/types';
import { PeerLink } from './link';
import { HostMessage, isGuestMessage } from './protocol';
import { encodeSnapshot } from './snapshot';

/** Real seconds between frames and HUD updates sent to every guest (design: Protocol). */
export const FRAME_INTERVAL = 1 / 20;
const HUD_INTERVAL = 1 / 10;
/** Every this many HUD updates also carries the guest's result so far. */
const RESULT_EVERY = 10;
/** A guest's inputs wait in order; more than this and the oldest are dropped to keep latency low. */
const MAX_QUEUED_INPUTS = 6;
const KEEP_QUEUED_INPUTS = 3;
/** The run starts without guests who have not loaded after this long (real seconds). */
const LOAD_TIMEOUT = 60;

interface Seat {
  readonly slot: number;
  readonly playerId: number;
  readonly link: PeerLink;
  readonly inbox: unknown[];
  readonly queue: { seq: number; input: PlayerInput }[];
  /** The seq of the guest's last input applied by a step. */
  ack: number;
  /** The deepest realm the guest has loaded (−1: none yet). */
  loadedDepth: number;
  open: boolean;
  /** Events only this guest sees (their own choice answers). */
  own: SimEvent[];
}

/**
 * The host's side of a room's run (D16, design: Host): applies each guest's inputs in order, lets guests answer their
 * own choices, and sends every guest the world, their HUD, their choices and their result. A guest whose link
 * closes leaves the battle.
 */
export class RoomHost {
  private readonly seats: Seat[] = [];
  private shared: SimEvent[] = [];
  private frameTimer = 0;
  private hudTimer = 0;
  private hudCount = 0;
  private waited = 0;

  constructor(
    private readonly sim: RunSimulation,
    links: ReadonlyMap<number, PeerLink>,
  ) {
    for (const [slot, link] of links) {
      const player = sim.state.players[slot];
      if (!player || slot === 0) {
        link.close();
        continue;
      }
      const seat: Seat = {
        slot,
        playerId: player.id,
        link,
        inbox: [],
        queue: [],
        ack: 0,
        loadedDepth: -1,
        open: true,
        own: [],
      };
      this.seats.push(seat);
      // Messages are applied in `receive`, between frames, never in the middle of a step.
      link.onMessage((m) => seat.inbox.push(m));
      link.onClose(() => {
        if (!seat.open) return;
        seat.open = false;
        sim.leave(seat.playerId);
      });
    }
  }

  /** Every guest has loaded the current realm, left, or had a minute to load it. */
  get everyoneLoaded(): boolean {
    return this.waited >= LOAD_TIMEOUT || this.seats.every((s) => this.ready(s));
  }

  /** The host and every guest who has loaded or left, as a fraction of the room. */
  get loadedFraction(): number {
    const done = this.seats.filter((s) => this.ready(s)).length;
    return (1 + done) / (1 + this.seats.length);
  }

  /** The party passed a gate: everyone loads the new realm, and they hear of it at once (spec: endless-run). */
  newRealm(): void {
    this.waited = 0;
    for (const seat of this.seats) seat.queue.length = 0;
    this.frameTimer = FRAME_INTERVAL;
    this.tick(0, true);
  }

  private ready(seat: Seat): boolean {
    return !seat.open || seat.loadedDepth >= this.sim.state.depth;
  }

  /** Applies what the guests sent since the last frame, `dt` real seconds ago. */
  receive(dt: number): void {
    this.waited += dt;
    for (const seat of this.seats) {
      for (const m of seat.inbox.splice(0)) {
        if (!isGuestMessage(m)) continue;
        switch (m.type) {
          case 'loaded':
            seat.loadedDepth = Math.max(seat.loadedDepth, m.depth);
            break;
          case 'input':
            seat.queue.push({ seq: m.seq, input: { moveX: m.x, moveY: m.y, ability: m.ability } });
            if (seat.queue.length > MAX_QUEUED_INPUTS)
              seat.queue.splice(0, seat.queue.length - KEEP_QUEUED_INPUTS);
            break;
          case 'choose':
            // A guest may only answer their own choice (spec: rooms / choices in a room).
            if (this.sim.choiceFor(seat.playerId)?.id === m.choiceId)
              this.sim.choose(m.index, m.choiceId);
            break;
        }
      }
    }
  }

  /**
   * One step's inputs by slot: the host's own, then each guest's next queued input. A guest whose input has not
   * arrived stands still for the step rather than repeating the last one, so the guest's prediction stays exact.
   */
  inputs(local: PlayerInput): PlayerInput[] {
    const inputs: PlayerInput[] = [local];
    for (const seat of this.seats) {
      const next = seat.open ? seat.queue.shift() : undefined;
      if (next) seat.ack = next.seq;
      inputs[seat.slot] = next?.input ?? NO_INPUT;
    }
    return inputs;
  }

  /** Routes the simulation's events: own choices to their player, the result to everyone, the rest to the next frame. */
  forward(events: readonly SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'choice':
          this.seatOf(e.choice.playerId)?.link.send(message({ type: 'choice', choice: e.choice }));
          break;
        case 'choiceResolved':
          this.seatOf(e.playerId)?.own.push(e);
          break;
        case 'runEnded':
          for (const seat of this.open())
            seat.link.send(message({ type: 'ended', result: this.sim.resultFor(seat.playerId) }));
          break;
        default:
          this.shared.push(e);
      }
    }
  }

  /** Sends frames and HUDs on their real-time schedules; `waiting`: the run waits for the party to load. */
  tick(dt: number, waiting = false): void {
    this.frameTimer += dt;
    if (this.frameTimer >= FRAME_INTERVAL) {
      // After a hitch, send one frame now rather than a burst.
      this.frameTimer = Math.min(this.frameTimer - FRAME_INTERVAL, FRAME_INTERVAL);
      const snapshot = encodeSnapshot(this.sim.state, this.sim.phase, waiting);
      for (const seat of this.open()) {
        seat.link.send(
          message({
            type: 'frame',
            snapshot,
            ack: seat.ack,
            events: seat.own.length ? [...this.shared, ...seat.own] : this.shared,
          }),
        );
        seat.own = [];
      }
      this.shared = [];
    }
    this.hudTimer += dt;
    if (this.hudTimer >= HUD_INTERVAL) {
      this.hudTimer = Math.min(this.hudTimer - HUD_INTERVAL, HUD_INTERVAL);
      const withResult = this.hudCount++ % RESULT_EVERY === 0;
      for (const seat of this.open())
        seat.link.send(
          message({
            type: 'hud',
            hud: this.sim.hud(seat.playerId),
            result: withResult ? this.sim.resultFor(seat.playerId) : undefined,
          }),
        );
    }
  }

  /** The host leaves: every guest's run ends (spec: rooms / leaving). */
  close(): void {
    for (const seat of this.seats) {
      seat.open = false;
      seat.link.close();
    }
  }

  private open(): Seat[] {
    return this.seats.filter((s) => s.open);
  }

  private seatOf(playerId: number): Seat | undefined {
    return this.seats.find((s) => s.open && s.playerId === playerId);
  }
}

const message = (m: HostMessage): HostMessage => m;
