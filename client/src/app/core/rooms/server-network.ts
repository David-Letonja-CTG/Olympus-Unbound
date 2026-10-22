import { PeerLink } from '../../../engine';
import { GameServer } from '../game-server';
import { OpenRoom, PublicListing, RoomError, RoomListing, RoomNetwork } from './room-network';
import { decodeMessage, encodeMessage } from './wire';

/** A host or guest that has not been let in by now finds the server unreachable. */
const CONNECT_TIMEOUT_MS = 10_000;

/** The server's control messages (design: Rooms over WebSocket). */
type ServerText =
  | { t: 'hosting' }
  | { t: 'joined' }
  | { t: 'error'; reason: string }
  | { t: 'guest'; guest: number }
  | { t: 'gone'; guest: number };

/** Something that opens WebSockets: the browser's, or a fake in tests. */
export type SocketFactory = (url: string) => WebSocket;

const REASONS: Record<string, RoomError['reason']> = {
  taken: 'taken',
  'not-found': 'not-found',
  full: 'full',
};

/**
 * Rooms through the game server (D21, design: Rooms over WebSocket). A host's socket carries every guest's link,
 * framed by guest number; a guest's socket is its one link to the host. Messages are encoded by `wire.ts`.
 */
export class ServerNetwork implements RoomNetwork {
  constructor(
    private readonly server: GameServer,
    private readonly socket: SocketFactory = (url) => new WebSocket(url),
  ) {}

  open(code: string, version: string, onGuest: (link: PeerLink) => void): Promise<RoomListing> {
    return new Promise((resolve, reject) => {
      const ws = this.connect(reject);
      if (!ws) return;
      const links = new Map<number, ChannelLink>();
      let opened = false;
      const timer = setTimeout(() => fail('unreachable'), CONNECT_TIMEOUT_MS);
      // The reason first: closing the socket would report it as unreachable.
      const fail = (reason: RoomError['reason']) => {
        clearTimeout(timer);
        if (!opened) reject(new RoomError(reason));
        opened = true;
        ws.close();
      };
      ws.onopen = () => ws.send(JSON.stringify({ t: 'host', code, version }));
      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          const bytes = new Uint8Array(event.data as ArrayBuffer);
          if (bytes.length < 4) return;
          const guest = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true);
          links.get(guest)?.receive(bytes.subarray(4));
          return;
        }
        const m = JSON.parse(event.data) as ServerText;
        if (m.t === 'hosting') {
          opened = true;
          clearTimeout(timer);
          resolve({
            publish: (listing: PublicListing | undefined) =>
              sendText(ws, { t: 'list', room: listing ?? null }),
            close: () => ws.close(1000),
          });
        } else if (m.t === 'error') {
          fail(REASONS[m.reason] ?? 'unreachable');
        } else if (m.t === 'guest') {
          const link = new ChannelLink(
            (bytes) => sendBinary(ws, framed(m.guest, bytes)),
            () => sendText(ws, { t: 'drop', guest: m.guest }),
          );
          links.set(m.guest, link);
          onGuest(link);
        } else if (m.t === 'gone') {
          links.get(m.guest)?.closed();
          links.delete(m.guest);
        }
      };
      ws.onclose = () => {
        clearTimeout(timer);
        if (!opened) reject(new RoomError('unreachable'));
        for (const link of links.values()) link.closed();
        links.clear();
      };
    });
  }

  join(code: string): Promise<PeerLink> {
    return new Promise((resolve, reject) => {
      const ws = this.connect(reject);
      if (!ws) return;
      let link: ChannelLink | undefined;
      const timer = setTimeout(() => {
        ws.close();
        reject(new RoomError('unreachable'));
      }, CONNECT_TIMEOUT_MS);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', code }));
      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          link?.receive(new Uint8Array(event.data as ArrayBuffer));
          return;
        }
        const m = JSON.parse(event.data) as ServerText;
        if (m.t === 'joined' && !link) {
          clearTimeout(timer);
          link = new ChannelLink(
            (bytes) => sendBinary(ws, bytes),
            () => ws.close(1000),
          );
          resolve(link);
        } else if (m.t === 'error' && !link) {
          clearTimeout(timer);
          reject(new RoomError(REASONS[m.reason] ?? 'unreachable'));
        }
      };
      ws.onclose = () => {
        clearTimeout(timer);
        if (link) link.closed();
        else reject(new RoomError('unreachable'));
      };
    });
  }

  async openRooms(version: string): Promise<readonly OpenRoom[]> {
    try {
      const { rooms } = await this.server.get<{ rooms: OpenRoom[] }>(
        `/api/rooms?version=${encodeURIComponent(version)}`,
      );
      return Array.isArray(rooms) ? rooms : [];
    } catch {
      throw new RoomError('unreachable');
    }
  }

  /** A socket to the server, or undefined (and `reject`ed) when there is no server or no WebSocket. */
  private connect(reject: (e: RoomError) => void): WebSocket | undefined {
    if (!this.server.configured) {
      reject(new RoomError('unreachable'));
      return undefined;
    }
    try {
      const ws = this.socket(this.server.roomsUrl());
      ws.binaryType = 'arraybuffer';
      return ws;
    } catch {
      reject(new RoomError('unsupported'));
      return undefined;
    }
  }
}

/** One link to one other browser in a room: messages encoded, closed once from either end. */
class ChannelLink implements PeerLink {
  private readonly listeners = new Set<(message: unknown) => void>();
  private readonly closers = new Set<() => void>();
  private open = true;

  constructor(
    private readonly sendBytes: (bytes: Uint8Array<ArrayBuffer>) => void,
    private readonly closeRemote: () => void,
  ) {}

  send(message: unknown): void {
    if (this.open) this.sendBytes(encodeMessage(message));
  }

  onMessage(listener: (message: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  onClose(listener: () => void): () => void {
    this.closers.add(listener);
    return () => void this.closers.delete(listener);
  }

  close(): void {
    if (!this.open) return;
    this.closeRemote();
    this.closed();
  }

  /** @internal Bytes arrived for this link. */
  receive(bytes: Uint8Array): void {
    if (!this.open) return;
    let message: unknown;
    try {
      message = decodeMessage(bytes);
    } catch {
      return; // Not ours: a malformed message must not break the run (D16).
    }
    for (const listener of [...this.listeners]) listener(message);
  }

  /** @internal The other end or the server closed it. */
  closed(): void {
    if (!this.open) return;
    this.open = false;
    for (const closer of [...this.closers]) closer();
    this.closers.clear();
    this.listeners.clear();
  }
}

function sendText(ws: WebSocket, message: object): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function sendBinary(ws: WebSocket, bytes: Uint8Array<ArrayBuffer>): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(bytes);
}

/** `[u32 guest][payload]`: how a host addresses one guest through the server. */
function framed(guest: number, payload: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(4 + payload.length);
  new DataView(out.buffer).setUint32(0, guest, true);
  out.set(payload, 4);
  return out;
}
