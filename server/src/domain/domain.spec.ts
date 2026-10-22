import { describe, expect, it } from 'vitest';
import { hasFreeSeat, parseListing } from './listing.js';
import { isRoomCode } from './room-code.js';
import { checkSubmission, isNearDate, scoreOf } from './score.js';

const NOW = new Date('2026-10-22T12:00:00Z');

const run = (changes: Record<string, unknown> = {}) => ({
  runId: '0b9d6a4e-7c1f-4c3a-9b2d-1f2e3a4b5c6d',
  board: 'solo',
  names: ['Ada'],
  godId: 'zeus',
  realmId: 'mount_olympus',
  players: 1,
  bots: 0,
  realmsCleared: 1,
  timeSeconds: 600,
  kills: 1500,
  level: 20,
  version: '0.11.1-r7',
  ...changes,
});

describe('room codes (spec: rooms / creating a room)', () => {
  it('take five letters or digits that cannot be confused', () => {
    expect(isRoomCode('K7M2Q')).toBe(true);
    expect(isRoomCode('K7M2')).toBe(false);
    expect(isRoomCode('K7M2O')).toBe(false); // O looks like 0
    expect(isRoomCode('k7m2q')).toBe(false);
    expect(isRoomCode(12345)).toBe(false);
  });
});

describe('public listings (spec: matchmaking / public rooms)', () => {
  const listing = { name: 'Ada', godId: 'zeus', realmId: 'mount_olympus', players: 2, seats: 4 };

  it('keep what a host may show, and refuse the rest', () => {
    expect(parseListing(listing)).toEqual(listing);
    expect(parseListing({ ...listing, name: '  Ada  ' })?.name).toBe('Ada');
    expect(parseListing({ ...listing, name: '' })).toBeUndefined();
    expect(parseListing({ ...listing, godId: 'Zeus!' })).toBeUndefined();
    expect(parseListing({ ...listing, players: 5 })).toBeUndefined();
    expect(parseListing({ ...listing, seats: 99 })).toBeUndefined();
    expect(parseListing(null)).toBeUndefined();
  });

  it('are listed only with a free seat', () => {
    expect(hasFreeSeat(listing)).toBe(true);
    expect(hasFreeSeat({ ...listing, players: 4 })).toBe(false);
  });
});

describe('fair scores (spec: world-leaderboards / fair scores)', () => {
  it('computes the score itself, with the Hall formula', () => {
    const result = checkSubmission(run({ score: 99_999_999 }), NOW);
    expect(result).toHaveProperty('entry');
    const entry = (result as { entry: { score: number } }).entry;
    expect(entry.score).toBe(
      scoreOf({ kills: 1500, timeSeconds: 600, level: 20, realmsCleared: 1 }),
    );
    expect(entry.score).toBe(1500 + 1200 + 200 + 1000);
  });

  it('refuses impossible runs', () => {
    expect(checkSubmission(run({ realmsCleared: 10, timeSeconds: 300 }), NOW)).toEqual({
      refusal: 'impossible',
    });
    expect(checkSubmission(run({ kills: 100_000, timeSeconds: 60 }), NOW)).toEqual({
      refusal: 'impossible',
    });
    expect(checkSubmission(run({ timeSeconds: 99 * 3600 }), NOW)).toEqual({
      refusal: 'impossible',
    });
  });

  it('refuses malformed figures, parties, names and ids', () => {
    expect(checkSubmission(run({ kills: -1 }), NOW)).toEqual({ refusal: 'bad-figures' });
    expect(checkSubmission(run({ kills: 1.5 }), NOW)).toEqual({ refusal: 'bad-figures' });
    expect(checkSubmission(run({ players: 5 }), NOW)).toEqual({ refusal: 'bad-party' });
    expect(checkSubmission(run({ players: 2, bots: 2 }), NOW)).toEqual({ refusal: 'bad-party' });
    expect(checkSubmission(run({ board: 'coop', players: 2, bots: 1 }), NOW)).toEqual({
      refusal: 'bad-party',
    });
    expect(checkSubmission(run({ names: [] }), NOW)).toEqual({ refusal: 'bad-names' });
    expect(checkSubmission(run({ names: ['x'.repeat(17)] }), NOW)).toEqual({
      refusal: 'bad-names',
    });
    expect(checkSubmission(run({ godId: 'DROP TABLE' }), NOW)).toEqual({ refusal: 'bad-ids' });
    expect(checkSubmission(run({ board: 'best' }), NOW)).toEqual({ refusal: 'bad-board' });
    expect(checkSubmission(run({ runId: 'x' }), NOW)).toEqual({ refusal: 'bad-run-id' });
  });

  it('takes a Daily Trial date only near its own', () => {
    expect(checkSubmission(run({ board: 'daily', date: '2026-10-22' }), NOW)).toHaveProperty(
      'entry',
    );
    expect(checkSubmission(run({ board: 'daily', date: '2026-10-21' }), NOW)).toHaveProperty(
      'entry',
    );
    expect(checkSubmission(run({ board: 'daily', date: '2026-10-01' }), NOW)).toEqual({
      refusal: 'bad-date',
    });
    expect(checkSubmission(run({ board: 'daily' }), NOW)).toEqual({ refusal: 'bad-date' });
    expect(isNearDate('2026-02-30', NOW)).toBe(false);
  });

  it('keeps names trimmed and a co-op party whole', () => {
    const result = checkSubmission(
      run({ board: 'coop', players: 3, names: [' Ada ', 'Bo', 'Cy'] }),
      NOW,
    ) as unknown as { entry: { names: string[] } };
    expect(result.entry.names).toEqual(['Ada', 'Bo', 'Cy']);
  });
});
