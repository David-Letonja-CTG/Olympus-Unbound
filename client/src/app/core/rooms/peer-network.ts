import { DataConnection, Peer, PeerError } from 'peerjs';
import { PeerLink } from '../../../engine';
import { RoomError, RoomErrorReason, RoomListing, RoomNetwork } from './room-network';

/** Peer IDs on the public signalling service: the game's prefix and the room code. */
const PREFIX = 'olympus-unbound-room-';
const JOIN_TIMEOUT_MS = 15_000;

/**
 * Rooms over WebRTC data channels with PeerJS and its public signalling service (D16). The host's peer ID is
 * derived from the room code; guests connect to it. Only this file uses PeerJS (lint).
 */
export class PeerNetwork implements RoomNetwork {
  open(code: string, onGuest: (link: PeerLink) => void): Promise<RoomListing> {
    return new Promise((resolve, reject) => {
      const peer = new Peer(PREFIX + code);
      let opened = false;
      peer.on('open', () => {
        opened = true;
        resolve({ close: () => peer.destroy() });
      });
      peer.on('connection', (connection) =>
        connection.on('open', () => onGuest(linkOf(connection))),
      );
      peer.on('error', (error) => {
        if (opened) return;
        peer.destroy();
        reject(new RoomError(reasonOf(error, 'taken')));
      });
    });
  }

  join(code: string): Promise<PeerLink> {
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      let settled = false;
      const fail = (reason: RoomErrorReason) => {
        if (settled) return;
        settled = true;
        peer.destroy();
        reject(new RoomError(reason));
      };
      const timer = setTimeout(() => fail('unreachable'), JOIN_TIMEOUT_MS);
      peer.on('open', () => {
        const connection = peer.connect(PREFIX + code, { reliable: true });
        connection.on('open', () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          // The guest's peer lives as long as its link to the host.
          resolve(linkOf(connection, () => peer.destroy()));
        });
        connection.on('error', () => fail('unreachable'));
      });
      peer.on('error', (error) => {
        clearTimeout(timer);
        fail(reasonOf(error, 'unreachable'));
      });
    });
  }
}

function reasonOf(error: PeerError<string>, unavailable: RoomErrorReason): RoomErrorReason {
  switch (error.type) {
    case 'unavailable-id':
      return unavailable;
    case 'peer-unavailable':
      return 'not-found';
    case 'browser-incompatible':
      return 'unsupported';
    default:
      return 'unreachable';
  }
}

function linkOf(connection: DataConnection, onClosed?: () => void): PeerLink {
  const closers = new Set<() => void>();
  let closed = false;
  const closeOnce = () => {
    if (closed) return;
    closed = true;
    for (const c of closers) c();
    onClosed?.();
  };
  connection.on('close', closeOnce);
  connection.on('error', closeOnce);
  return {
    send(message) {
      if (!closed && connection.open) void connection.send(message);
    },
    onMessage(listener) {
      connection.on('data', listener);
      return () => void connection.off('data', listener);
    },
    onClose(listener) {
      closers.add(listener);
      return () => void closers.delete(listener);
    },
    close() {
      connection.close();
      closeOnce();
    },
  };
}
