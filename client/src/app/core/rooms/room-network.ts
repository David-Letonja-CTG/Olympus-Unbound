import { InjectionToken } from '@angular/core';
import { PeerLink } from '../../../engine';
import { debugEnabled } from '../debug-mode';

/** Why a room could not be opened or joined (spec: rooms / joining a room). */
export type RoomErrorReason = 'taken' | 'not-found' | 'unreachable' | 'unsupported';

export class RoomError extends Error {
  constructor(readonly reason: RoomErrorReason) {
    super(reason);
  }
}

/** An open room: closing it stops listening and closes every link (D16). */
export interface RoomListing {
  close(): void;
}

/**
 * Finds other browsers by room code and connects to them directly (D16). Nothing is stored; a signalling service
 * only introduces the browsers.
 */
export interface RoomNetwork {
  /** Opens the room `code`; every browser that joins arrives at `onGuest`. Rejects with `taken` if in use. */
  open(code: string, onGuest: (link: PeerLink) => void): Promise<RoomListing>;
  /** Connects to the room `code`. Rejects with `not-found`, `unreachable` or `unsupported`. */
  join(code: string): Promise<PeerLink>;
}

/** Loads the network on first use, so menus and solo runs never load it. */
export const ROOM_NETWORK = new InjectionToken<() => Promise<RoomNetwork>>('ROOM_NETWORK', {
  providedIn: 'root',
  factory: () => async () => {
    // `?debug&net=local`: rooms between tabs of this browser, for end-to-end tests (no signalling service).
    if (debugEnabled() && new URLSearchParams(location.search).get('net') === 'local') {
      const { LocalNetwork } = await import('./local-network');
      return new LocalNetwork();
    }
    const { PeerNetwork } = await import('./peer-network');
    return new PeerNetwork();
  },
});
