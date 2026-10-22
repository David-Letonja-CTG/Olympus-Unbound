import { cleanName, isContentId } from './ids.js';

/** Seats a room may report; the host's game allows four (spec: rooms), the bound is looser. */
export const MAX_SEATS = 8;

/** What a public room shows in the open rooms (spec: matchmaking / public rooms). */
export interface PublicListing {
  readonly name: string;
  readonly godId: string;
  readonly realmId: string;
  readonly players: number;
  readonly seats: number;
}

const between = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/** A host's listing as sent, checked; undefined when malformed. */
export function parseListing(value: unknown): PublicListing | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const name = cleanName(v['name']);
  const { godId, realmId, players, seats } = v;
  if (!name || !isContentId(godId) || !isContentId(realmId)) return undefined;
  if (!between(seats, 2, MAX_SEATS) || !between(players, 1, seats)) return undefined;
  return { name, godId, realmId, players, seats };
}

/** Listed only while a seat is free (spec: matchmaking / public rooms). */
export function hasFreeSeat(listing: PublicListing): boolean {
  return listing.players < listing.seats;
}
