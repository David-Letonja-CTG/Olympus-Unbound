import { PeerLink } from '../../../engine';
import { OpenRoom, RoomError, RoomListing, RoomNetwork } from './room-network';

const CHANNEL = 'olympus-unbound-rooms';
/** Generous: on a busy test runner the host tab is in the background and answers late. */
const JOIN_TIMEOUT_MS = 6000;

type Envelope =
  | { kind: 'knock'; code: string; from: string }
  | { kind: 'welcome'; to: string; from: string }
  | { kind: 'data'; to: string; from: string; message: unknown }
  | { kind: 'close'; to: string; from: string };

/**
 * Rooms between tabs of one browser over a `BroadcastChannel` (`?debug&net=local`), so the docs capture script can
 * play a room without the game server. Debug builds only.
 */
export class LocalNetwork implements RoomNetwork {
  async open(
    code: string,
    _version: string,
    onGuest: (link: PeerLink) => void,
  ): Promise<RoomListing> {
    const channel = new BroadcastChannel(CHANNEL);
    const id = randomId();
    const links: (() => void)[] = [];
    channel.addEventListener('message', (e: MessageEvent<Envelope>) => {
      const m = e.data;
      if (m.kind !== 'knock' || m.code !== code) return;
      channel.postMessage({ kind: 'welcome', to: m.from, from: id } satisfies Envelope);
      const link = channelLink(id, m.from);
      links.push(() => link.close());
      onGuest(link);
    });
    return {
      // No server between tabs: nothing is listed.
      publish: () => undefined,
      close() {
        for (const close of links) close();
        channel.close();
      },
    };
  }

  async openRooms(): Promise<readonly OpenRoom[]> {
    return [];
  }

  join(code: string): Promise<PeerLink> {
    const channel = new BroadcastChannel(CHANNEL);
    const id = randomId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        channel.close();
        reject(new RoomError('not-found'));
      }, JOIN_TIMEOUT_MS);
      channel.addEventListener('message', (e: MessageEvent<Envelope>) => {
        const m = e.data;
        if (m.kind !== 'welcome' || m.to !== id) return;
        clearTimeout(timer);
        channel.close();
        resolve(channelLink(id, m.from));
      });
      channel.postMessage({ kind: 'knock', code, from: id } satisfies Envelope);
    });
  }
}

function channelLink(me: string, other: string): PeerLink {
  const channel = new BroadcastChannel(CHANNEL);
  const listeners = new Set<(m: unknown) => void>();
  const closers = new Set<() => void>();
  let closed = false;
  const closeOnce = () => {
    if (closed) return;
    closed = true;
    for (const c of closers) c();
    channel.close();
    removeEventListener('pagehide', leave);
  };
  // A closing tab says goodbye; a channel cannot notice a vanished tab by itself.
  const leave = () => {
    if (!closed) channel.postMessage({ kind: 'close', to: other, from: me } satisfies Envelope);
    closeOnce();
  };
  addEventListener('pagehide', leave);
  channel.addEventListener('message', (e: MessageEvent<Envelope>) => {
    const m = e.data;
    if (closed || m.from !== other || !('to' in m) || m.to !== me) return;
    if (m.kind === 'data') for (const l of listeners) l(m.message);
    else if (m.kind === 'close') closeOnce();
  });
  return {
    send(message) {
      if (!closed)
        channel.postMessage({ kind: 'data', to: other, from: me, message } satisfies Envelope);
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    onClose(listener) {
      closers.add(listener);
      return () => void closers.delete(listener);
    },
    close: leave,
  };
}

function randomId(): string {
  return globalThis.crypto.randomUUID();
}
