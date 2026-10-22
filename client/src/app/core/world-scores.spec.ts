import { TestBed } from '@angular/core/testing';
import { RunResult } from '../../engine';
import { GAME_SERVER_URL } from './game-server';
import { WORLD_SCORES_STORAGE, WorldScores, worldBoardOf } from './world-scores';

const result = (changes: Partial<RunResult> = {}): RunResult => ({
  runId: 'run-0001-aaaa',
  godId: 'zeus',
  realmId: 'mount_olympus',
  seed: 1,
  outcome: 'defeat',
  timeSeconds: 600.4,
  level: 20,
  kills: 1500,
  gold: 10,
  realmsCleared: 1,
  realmReached: 'the_underworld',
  players: 1,
  bots: 0,
  loadout: {
    weapons: [],
    skills: [],
    relics: [],
    synergies: [],
  } as unknown as RunResult['loadout'],
  ...changes,
});

/** A server that answers from a script: the status of each POST, and the posted bodies. */
function stubServer(statuses: number[]) {
  const posted: Record<string, unknown>[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posted.push(JSON.parse(String(init.body)));
        const status = statuses.shift() ?? 200;
        if (status === 0) throw new TypeError('network down');
        return new Response(JSON.stringify(status === 200 ? { status: 'added' } : { code: 'x' }), {
          status,
        });
      }
      return new Response(JSON.stringify({ entries: [{ id: '1', rank: 1, names: ['Ada'] }] }), {
        status: 200,
      });
    }),
  );
  return posted;
}

function setUp(url = 'https://olympus.example') {
  const data: Record<string, string> = {};
  TestBed.configureTestingModule({
    providers: [
      { provide: GAME_SERVER_URL, useValue: url },
      {
        provide: WORLD_SCORES_STORAGE,
        useValue: {
          getItem: (k: string) => data[k] ?? null,
          setItem: (k: string, v: string) => void (data[k] = v),
        },
      },
    ],
  });
  return { scores: TestBed.inject(WorldScores), data };
}

const waiting = (data: Record<string, string>) =>
  JSON.parse(data['olympus-unbound/world-scores'] ?? '[]') as unknown[];

describe('world boards (spec: world-leaderboards)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends a run to the board of its kind, with the names and the run figures', async () => {
    const posted = stubServer([200]);
    const { scores } = setUp();
    scores.submit(result(), ['Ada'], 'v1');
    await scores.flush();
    expect(posted).toEqual([
      {
        runId: 'run-0001-aaaa',
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
        version: 'v1',
      },
    ]);
  });

  it('picks the board: allies, co-op, quick, the day of a Daily Trial, none for a twisted challenge', () => {
    expect(worldBoardOf(result({ players: 2, bots: 1 }))).toEqual({ board: 'allies' });
    expect(worldBoardOf(result({ players: 3 }))).toEqual({ board: 'coop' });
    expect(worldBoardOf(result({ variant: { kind: 'quick' } }))).toEqual({ board: 'quick' });
    expect(
      worldBoardOf(result({ variant: { kind: 'daily', date: '2026-10-22', twistId: 'x' } })),
    ).toEqual({ board: 'daily', date: '2026-10-22' });
    expect(worldBoardOf(result({ variant: { kind: 'challenge', twistId: 'x' } }))).toBeUndefined();
  });

  it("leaves a guest's co-op run to the host", async () => {
    const posted = stubServer([]);
    const { scores } = setUp();
    scores.submit(result({ players: 2 }), ['Ada', 'Bo'], 'v1', true);
    await scores.flush();
    expect(posted).toEqual([]);
  });

  it('keeps a run it could not send and sends it at the next start', async () => {
    stubServer([0]);
    const { scores, data } = setUp();
    scores.submit(result(), ['Ada'], 'v1');
    await scores.flush();
    expect(waiting(data)).toHaveLength(1);
    const posted = stubServer([200]);
    await scores.flush();
    expect(posted).toHaveLength(1);
    expect(waiting(data)).toHaveLength(0);
  });

  it('drops a run the server refused for good, and keeps one it was too busy for', async () => {
    stubServer([400, 429]);
    const { scores, data } = setUp();
    scores.submit(result({ runId: 'run-0001-aaaa' }), ['Ada'], 'v1');
    await scores.flush();
    expect(waiting(data)).toHaveLength(0);
    scores.submit(result({ runId: 'run-0002-bbbb' }), ['Ada'], 'v1');
    await scores.flush();
    expect(waiting(data)).toHaveLength(1);
  });

  it('does nothing in a build without a server', async () => {
    const posted = stubServer([]);
    const { scores, data } = setUp('');
    expect(scores.available).toBe(false);
    scores.submit(result(), ['Ada'], 'v1');
    await scores.flush();
    expect(posted).toEqual([]);
    expect(waiting(data)).toHaveLength(0);
  });

  it('reads a board with its filters', async () => {
    stubServer([]);
    const { scores } = setUp();
    const entries = await scores.board('daily', { date: '2026-10-22', godId: 'hades' });
    expect(entries[0]).toMatchObject({ rank: 1, names: ['Ada'] });
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toBe(
      'https://olympus.example/api/leaderboards/daily?limit=10&date=2026-10-22&god=hades',
    );
  });
});
