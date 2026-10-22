import { TestBed } from '@angular/core/testing';
import { GAME_SERVER_URL, GameServer } from '../game-server';
import { RoomError } from './room-network';
import { ServerNetwork } from './server-network';
import { decodeMessage, encodeMessage } from './wire';

/** A WebSocket the test drives: it records what the game sent and lets the test answer as the server. */
class FakeSocket {
  static readonly OPEN = 1;
  readyState = 0;
  binaryType = 'blob';
  readonly sent: (string | Uint8Array)[] = [];
  closedWith: number | undefined;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string | Uint8Array): void {
    this.sent.push(typeof data === 'string' ? data : new Uint8Array(data));
  }
  close(code = 1000): void {
    if (this.readyState === 3) return;
    this.closedWith = code;
    this.readyState = 3;
    this.onclose?.();
  }
  // -- As the server --
  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }
  text(message: object): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  binary(bytes: Uint8Array): void {
    this.onmessage?.({ data: bytes.slice().buffer });
  }
  texts(): Record<string, unknown>[] {
    return this.sent.filter((s) => typeof s === 'string').map((s) => JSON.parse(s as string));
  }
}

function setUp(url = 'https://olympus.example') {
  TestBed.configureTestingModule({ providers: [{ provide: GAME_SERVER_URL, useValue: url }] });
  const sockets: FakeSocket[] = [];
  const network = new ServerNetwork(TestBed.inject(GameServer), (u) => {
    const s = new FakeSocket(u);
    sockets.push(s);
    return s as unknown as WebSocket;
  });
  return { network, sockets };
}

const framed = (guest: number, payload: Uint8Array) => {
  const out = new Uint8Array(4 + payload.length);
  new DataView(out.buffer).setUint32(0, guest, true);
  out.set(payload, 4);
  return out;
};

describe('room messages on the wire (design: Rooms over WebSocket)', () => {
  it('round-trips structured values with their ArrayBuffers', () => {
    const snapshot = new Uint8Array([1, 2, 3, 250]).buffer;
    const message = { type: 'frame', snapshot, ack: 7, events: [{ type: 'kill', x: 1.5 }] };
    const back = decodeMessage(encodeMessage(message)) as typeof message;
    expect(back.ack).toBe(7);
    expect(back.events).toEqual(message.events);
    expect(back.snapshot).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(back.snapshot)]).toEqual([1, 2, 3, 250]);
  });

  it('refuses bytes it did not write', () => {
    const bytes = encodeMessage({ a: new ArrayBuffer(8) });
    expect(() => decodeMessage(bytes.subarray(0, bytes.length - 2))).toThrow();
  });
});

describe('rooms through the game server (spec: rooms)', () => {
  it('opens a room as host, links each guest, and frames messages by guest', async () => {
    const { network, sockets } = setUp();
    const guests: {
      messages: unknown[];
      closed: boolean;
      link: import('../../../engine').PeerLink;
    }[] = [];
    const opening = network.open('K7M2Q', 'v1', (link) => {
      const g = { messages: [] as unknown[], closed: false, link };
      link.onMessage((m) => g.messages.push(m));
      link.onClose(() => (g.closed = true));
      guests.push(g);
    });
    const ws = sockets[0];
    expect(ws.url).toBe('wss://olympus.example/rooms');
    ws.open();
    expect(ws.texts()[0]).toEqual({ t: 'host', code: 'K7M2Q', version: 'v1' });
    ws.text({ t: 'hosting' });
    const listing = await opening;

    ws.text({ t: 'guest', guest: 3 });
    ws.binary(framed(3, encodeMessage({ type: 'hello', name: 'Bo' })));
    expect(guests[0].messages).toEqual([{ type: 'hello', name: 'Bo' }]);

    guests[0].link.send({ type: 'welcome', slot: 1 });
    const out = ws.sent.at(-1) as Uint8Array;
    expect(new DataView(out.buffer).getUint32(0, true)).toBe(3);
    expect(decodeMessage(out.subarray(4))).toEqual({ type: 'welcome', slot: 1 });

    listing.publish({ name: 'Ada', godId: 'zeus', realmId: 'mount_olympus', players: 2, seats: 4 });
    expect(ws.texts().at(-1)).toEqual({
      t: 'list',
      room: { name: 'Ada', godId: 'zeus', realmId: 'mount_olympus', players: 2, seats: 4 },
    });
    listing.publish(undefined);
    expect(ws.texts().at(-1)).toEqual({ t: 'list', room: null });

    ws.text({ t: 'gone', guest: 3 });
    expect(guests[0].closed).toBe(true);
    listing.close();
    expect(ws.closedWith).toBe(1000);
  });

  it('drops a guest on the server when the host closes its link', async () => {
    const { network, sockets } = setUp();
    let link: import('../../../engine').PeerLink | undefined;
    const opening = network.open('K7M2Q', 'v1', (l) => (link = l));
    sockets[0].open();
    sockets[0].text({ t: 'hosting' });
    await opening;
    sockets[0].text({ t: 'guest', guest: 1 });
    link?.close();
    expect(sockets[0].texts().at(-1)).toEqual({ t: 'drop', guest: 1 });
  });

  it('joins a room as guest and carries messages both ways', async () => {
    const { network, sockets } = setUp();
    const joining = network.join('K7M2Q');
    const ws = sockets[0];
    ws.open();
    expect(ws.texts()[0]).toEqual({ t: 'join', code: 'K7M2Q' });
    ws.text({ t: 'joined' });
    const link = await joining;
    const got: unknown[] = [];
    let closed = false;
    link.onMessage((m) => got.push(m));
    link.onClose(() => (closed = true));
    ws.binary(encodeMessage({ type: 'lobby', members: [] }));
    expect(got).toEqual([{ type: 'lobby', members: [] }]);
    link.send({ type: 'update', ready: true });
    expect(decodeMessage(ws.sent.at(-1) as Uint8Array)).toEqual({ type: 'update', ready: true });
    // The host left: the server closes the guest's socket.
    ws.close(4001);
    expect(closed).toBe(true);
  });

  it('reports a taken code, an unknown code and an unreachable server', async () => {
    const taken = setUp();
    const opening = taken.network.open('K7M2Q', 'v1', () => undefined);
    taken.sockets[0].open();
    taken.sockets[0].text({ t: 'error', reason: 'taken' });
    await expect(opening).rejects.toEqual(new RoomError('taken'));

    TestBed.resetTestingModule();
    const lost = setUp();
    const joining = lost.network.join('ZZZZZ');
    lost.sockets[0].open();
    lost.sockets[0].text({ t: 'error', reason: 'not-found' });
    await expect(joining).rejects.toEqual(new RoomError('not-found'));

    TestBed.resetTestingModule();
    const down = setUp();
    const failing = down.network.join('K7M2Q');
    down.sockets[0].close(1006);
    await expect(failing).rejects.toEqual(new RoomError('unreachable'));
  });

  it('offers nothing when the build has no server', async () => {
    const { network, sockets } = setUp('');
    await expect(network.join('K7M2Q')).rejects.toEqual(new RoomError('unreachable'));
    expect(sockets).toHaveLength(0);
  });
});
