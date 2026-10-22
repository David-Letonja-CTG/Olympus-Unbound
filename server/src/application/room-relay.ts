import { hasFreeSeat, parseListing, type PublicListing } from '../domain/listing.js';
import { isRoomCode } from '../domain/room-code.js';
import { isVersion } from '../domain/ids.js';
import type { Clock } from './ports.js';

/** One client's connection, as the relay sees it; the api adapts a WebSocket to it. */
export interface RelaySocket {
  /** The client's address, for the per-address limit only; never stored (spec: game-server / what the server keeps). */
  readonly address: string;
  sendText(text: string): void;
  sendBinary(data: Uint8Array): void;
  close(code: number, reason: string): void;
}

/** Bounds on what one client can use (spec: game-server / limits; design: Rooms over WebSocket). */
export interface RelayLimits {
  readonly maxFrameBytes: number;
  readonly framesPerWindow: number;
  readonly windowMs: number;
  readonly socketsPerAddress: number;
  readonly guestsPerRoom: number;
  readonly maxTextBytes: number;
}

export const DEFAULT_LIMITS: RelayLimits = {
  maxFrameBytes: 256 * 1024,
  framesPerWindow: 600,
  windowMs: 5000,
  socketsPerAddress: 16,
  guestsPerRoom: 8,
  maxTextBytes: 4096,
};

/** Close codes the game reads (design: Rooms over WebSocket). */
export const CLOSE = {
  error: 4000,
  hostLeft: 4001,
  dropped: 4002,
  tooFast: 4008,
  tooBig: 4009,
  tooMany: 4010,
} as const;

/** A public room as listed (spec: matchmaking / open rooms). */
export interface OpenRoom extends PublicListing {
  readonly code: string;
}

interface Room {
  readonly code: string;
  readonly version: string;
  readonly host: Session;
  readonly guests: Map<number, Session>;
  nextGuest: number;
  listing?: PublicListing;
  readonly openedAt: number;
}

/** What a client may send as text (design: Rooms over WebSocket). */
type Control =
  | { t: 'host'; code: unknown; version: unknown }
  | { t: 'join'; code: unknown }
  | { t: 'list'; room: unknown }
  | { t: 'drop'; guest: unknown };

/**
 * Rooms through the server (spec: rooms / creating a room; D21): the host's connection holds the room code, each
 * guest's is paired with it, and every room message is passed on unread, numbered by guest on the host's side. Rooms
 * live only in memory and end with their host. Public rooms are listed for matchmaking (spec: matchmaking).
 */
export class RoomRelay {
  private readonly rooms = new Map<string, Room>();
  private readonly perAddress = new Map<string, number>();

  constructor(
    private readonly clock: Clock,
    readonly limits: RelayLimits = DEFAULT_LIMITS,
  ) {}

  /** A new connection; undefined (and closed) when its address has too many open. */
  connect(socket: RelaySocket): Session | undefined {
    const open = this.perAddress.get(socket.address) ?? 0;
    if (open >= this.limits.socketsPerAddress) {
      socket.close(CLOSE.tooMany, 'too-many');
      return undefined;
    }
    this.perAddress.set(socket.address, open + 1);
    return new Session(this, socket, this.clock);
  }

  /** Public rooms of `version` with a free seat, fullest first (spec: matchmaking). */
  openRooms(version: string, limit = 50): OpenRoom[] {
    const open: (OpenRoom & { openedAt: number })[] = [];
    for (const room of this.rooms.values()) {
      if (room.version !== version || !room.listing || !hasFreeSeat(room.listing)) continue;
      open.push({ code: room.code, ...room.listing, openedAt: room.openedAt });
    }
    return open
      .sort((a, b) => b.players - a.players || a.openedAt - b.openedAt)
      .slice(0, limit)
      .map(({ openedAt: _openedAt, ...room }) => room);
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  // -- For sessions ------------------------------------------------------------------------------------------

  /** @internal */
  open(code: string, version: string, host: Session): Room | 'taken' {
    if (this.rooms.has(code)) return 'taken';
    const room: Room = {
      code,
      version,
      host,
      guests: new Map(),
      nextGuest: 1,
      openedAt: this.clock.now().getTime(),
    };
    this.rooms.set(code, room);
    return room;
  }

  /** @internal */
  find(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /** @internal */
  close(room: Room): void {
    if (this.rooms.get(room.code) === room) this.rooms.delete(room.code);
  }

  /** @internal */
  released(address: string): void {
    const open = (this.perAddress.get(address) ?? 1) - 1;
    if (open <= 0) this.perAddress.delete(address);
    else this.perAddress.set(address, open);
  }
}

/** One client in the relay: a host, a guest, or not yet either. */
export class Session {
  private role: 'none' | 'host' | 'guest' = 'none';
  private room: Room | undefined;
  private guestId = 0;
  private windowStart = 0;
  private framesInWindow = 0;
  private closed = false;

  constructor(
    private readonly relay: RoomRelay,
    /** @internal */
    readonly socket: RelaySocket,
    private readonly clock: Clock,
  ) {}

  onText(text: string): void {
    if (!this.withinRate()) return;
    if (text.length > this.relay.limits.maxTextBytes) return this.fail('bad-request');
    let message: Control;
    try {
      message = JSON.parse(text) as Control;
    } catch {
      return this.fail('bad-request');
    }
    switch (message?.t) {
      case 'host':
        return this.host(message.code, message.version);
      case 'join':
        return this.join(message.code);
      case 'list':
        return this.list(message.room);
      case 'drop':
        return this.drop(message.guest);
      default:
        return this.fail('bad-request');
    }
  }

  onBinary(data: Uint8Array): void {
    if (!this.withinRate()) return;
    if (data.length > this.relay.limits.maxFrameBytes) {
      this.end(CLOSE.tooBig, 'too-big');
      return;
    }
    const room = this.room;
    if (!room) return;
    if (this.role === 'host') {
      // [u32 guest][payload] → that guest gets the payload.
      if (data.length < 4) return;
      const id = new DataView(data.buffer, data.byteOffset, 4).getUint32(0, true);
      room.guests.get(id)?.socket.sendBinary(data.subarray(4));
    } else if (this.role === 'guest') {
      // payload → the host gets [u32 guest][payload].
      const framed = new Uint8Array(data.length + 4);
      new DataView(framed.buffer).setUint32(0, this.guestId, true);
      framed.set(data, 4);
      room.host.socket.sendBinary(framed);
    }
  }

  onClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.relay.released(this.socket.address);
    const room = this.room;
    this.room = undefined;
    if (!room) return;
    if (this.role === 'host') {
      this.relay.close(room);
      for (const guest of room.guests.values()) guest.end(CLOSE.hostLeft, 'host-left');
      room.guests.clear();
    } else if (this.role === 'guest' && room.guests.get(this.guestId) === this) {
      room.guests.delete(this.guestId);
      room.host.send({ t: 'gone', guest: this.guestId });
    }
  }

  // -- Control -----------------------------------------------------------------------------------------------

  private host(code: unknown, version: unknown): void {
    if (this.role !== 'none' || !isRoomCode(code) || !isVersion(version))
      return this.fail('bad-request');
    const room = this.relay.open(code, version, this);
    if (room === 'taken') return this.fail('taken');
    this.role = 'host';
    this.room = room;
    this.send({ t: 'hosting' });
  }

  private join(code: unknown): void {
    if (this.role !== 'none' || !isRoomCode(code)) return this.fail('bad-request');
    const room = this.relay.find(code);
    if (!room) return this.fail('not-found');
    // Seats are the host's to refuse (spec: rooms / joining a room); this only bounds the server.
    if (room.guests.size >= this.relay.limits.guestsPerRoom) return this.fail('full');
    this.role = 'guest';
    this.room = room;
    this.guestId = room.nextGuest++;
    room.guests.set(this.guestId, this);
    this.send({ t: 'joined' });
    room.host.send({ t: 'guest', guest: this.guestId });
  }

  private list(value: unknown): void {
    if (this.role !== 'host' || !this.room) return this.fail('bad-request');
    if (value === null) {
      this.room.listing = undefined;
      return;
    }
    const listing = parseListing(value);
    if (!listing) return this.fail('bad-request');
    this.room.listing = listing;
  }

  private drop(guest: unknown): void {
    if (this.role !== 'host' || !this.room || !Number.isInteger(guest)) return;
    const session = this.room.guests.get(guest as number);
    if (!session) return;
    this.room.guests.delete(guest as number);
    session.end(CLOSE.dropped, 'dropped');
  }

  // -- Plumbing ----------------------------------------------------------------------------------------------

  private withinRate(): boolean {
    const now = this.clock.now().getTime();
    if (now - this.windowStart >= this.relay.limits.windowMs) {
      this.windowStart = now;
      this.framesInWindow = 0;
    }
    if (++this.framesInWindow <= this.relay.limits.framesPerWindow) return true;
    this.end(CLOSE.tooFast, 'too-fast');
    return false;
  }

  /** @internal */
  send(message: object): void {
    if (!this.closed) this.socket.sendText(JSON.stringify(message));
  }

  private fail(reason: 'bad-request' | 'taken' | 'not-found' | 'full'): void {
    this.send({ t: 'error', reason });
    this.end(CLOSE.error, reason);
  }

  /** @internal Closes the connection; `onClose` follows from the socket. */
  end(code: number, reason: string): void {
    this.socket.close(code, reason);
    this.onClose();
  }
}
