import { InjectionToken, inject } from '@angular/core';
import { PeerLink } from '../../../engine';
import { debugEnabled } from '../debug-mode';
import { GameServer } from '../game-server';

/** Why a room could not be opened or joined (spec: rooms / joining a room; game-server). */
export type RoomErrorReason = 'taken' | 'not-found' | 'full' | 'unreachable' | 'unsupported';

export class RoomError extends Error {
  constructor(readonly reason: RoomErrorReason) {
    super(reason);
  }
}

/** What a public room shows to others (spec: matchmaking / public rooms). */
export interface PublicListing {
  readonly name: string;
  readonly godId: string;
  readonly realmId: string;
  readonly players: number;
  readonly seats: number;
}

/** A public room waiting for players (spec: matchmaking / open rooms). */
export interface OpenRoom extends PublicListing {
  readonly code: string;
}

/** An open room: closing it stops listening and closes every link. */
export interface RoomListing {
  /** Lists the room publicly with what it shows, or withdraws it (`undefined`). */
  publish(listing: PublicListing | undefined): void;
  close(): void;
}

/**
 * Connects browsers in rooms by code (D16, D21): through the game server, which passes their messages on unread.
 */
export interface RoomNetwork {
  /**
   * Opens the room `code` for game version `version` (listed only to the same version); every browser that joins
   * arrives at `onGuest`. Rejects with `taken` if in use.
   */
  open(code: string, version: string, onGuest: (link: PeerLink) => void): Promise<RoomListing>;
  /** Connects to the room `code`. Rejects with `not-found`, `full`, `unreachable` or `unsupported`. */
  join(code: string): Promise<PeerLink>;
  /** The public rooms of this game version waiting for players, fullest first (spec: matchmaking). */
  openRooms(version: string): Promise<readonly OpenRoom[]>;
}

/** Whether this build can offer rooms at all: a game server, or the test network. */
export function roomsOffered(server: GameServer): boolean {
  return server.configured || localNetworkAsked();
}

/** `?debug&net=local`: rooms between tabs of this browser, for capturing docs media (no server). */
function localNetworkAsked(): boolean {
  return debugEnabled() && new URLSearchParams(location.search).get('net') === 'local';
}

/** Loads the network on first use, so menus and solo runs never load it. */
export const ROOM_NETWORK = new InjectionToken<() => Promise<RoomNetwork>>('ROOM_NETWORK', {
  providedIn: 'root',
  factory: () => {
    const server = inject(GameServer);
    return async () => {
      if (localNetworkAsked()) {
        const { LocalNetwork } = await import('./local-network');
        return new LocalNetwork();
      }
      const { ServerNetwork } = await import('./server-network');
      return new ServerNetwork(server);
    };
  },
});
