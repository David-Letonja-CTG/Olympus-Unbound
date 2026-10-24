import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RunResult } from '../../../engine';
import { GAME_SERVER_URL } from '../../core/game-server';
import { Progression } from '../../core/progression';
import { SAVE_STORAGE } from '../../core/save/save-store';
import { GloryScreen } from './glory-screen';

const run = (overrides: Partial<RunResult>): RunResult => ({
  runId: 'x',
  godId: 'zeus',
  realmId: 'mount_olympus',
  seed: 1,
  outcome: 'defeat',
  timeSeconds: 300,
  level: 10,
  kills: 200,
  gold: 10,
  realmsCleared: 0,
  realmReached: 'mount_olympus',
  players: 1,
  bots: 0,
  loadout: { weapons: [], relics: [], skills: [], synergies: [], fusions: [] },
  ...overrides,
});

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SAVE_STORAGE, useValue: null }],
  });
  const progression = TestBed.inject(Progression);
  progression.recordRun(run({ runId: 'a', kills: 900, realmsCleared: 1 }));
  progression.recordRun(run({ runId: 'b', godId: 'hades', kills: 300 }));
  progression.recordRun(run({ runId: 'c', players: 2, kills: 50 }));
  const fixture = TestBed.createComponent(GloryScreen);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const click = (id: string) => {
    el.querySelector<HTMLButtonElement>(`[data-testid=${id}]`)?.click();
    fixture.detectChanges();
  };
  const rows = () => el.querySelectorAll('[data-testid=scores-table] tbody tr');
  return { el, click, rows };
}

describe('Hall of Glory (spec: glory / hall of glory)', () => {
  it('shows the solo and co-op tables, a filter per god, achievements and three quests', () => {
    const { el, click, rows } = setup();
    expect(rows()).toHaveLength(2);
    click('scores-god-hades');
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Hades');
    click('scores-god-all');
    click('scores-coop');
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('×2');
    expect(el.querySelectorAll('[data-testid=glory-quests] li')).toHaveLength(3);
    expect(
      el.querySelector('[data-testid=achievement-first_gate]')?.getAttribute('data-unlocked'),
    ).toBe('true');
    // 900 + 300 + 50 kills: Slayer is unlocked, Bane of the Horde shows its progress.
    expect(
      el.querySelector('[data-testid=achievement-slayer_1000]')?.getAttribute('data-unlocked'),
    ).toBe('true');
    expect(el.querySelector('[data-testid=achievement-slayer_10000]')?.textContent).toContain(
      '1,250 / 10,000',
    );
  });
});

describe('Hall of Glory, World (spec: world-leaderboards / world tables)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function world(entries: object[], fail = false) {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        if (fail) throw new TypeError('down');
        return new Response(JSON.stringify({ entries }), { status: 200 });
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SAVE_STORAGE, useValue: null },
        { provide: GAME_SERVER_URL, useValue: 'https://olympus.example' },
      ],
    });
    const fixture = TestBed.createComponent(GloryScreen);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r));
        fixture.detectChanges();
      }
    };
    const click = async (id: string) => {
      el.querySelector<HTMLButtonElement>(`[data-testid=${id}]`)?.click();
      await settle();
    };
    return { el, click, urls, settle };
  }

  const entry = {
    id: '7',
    rank: 1,
    names: ['Ada', 'Bo'],
    godId: 'hades',
    realmId: 'mount_olympus',
    players: 2,
    bots: 0,
    realmsCleared: 2,
    timeSeconds: 900,
    kills: 3000,
    level: 30,
    score: 6100,
    endedAt: '2026-10-22T10:00:00Z',
  };

  it('lists the world table with players’ names, following mode and god', async () => {
    const { el, click, urls } = world([entry]);
    await click('scores-world');
    const rows = el.querySelectorAll('[data-testid=world-table] tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Ada, Bo');
    expect(rows[0].textContent).toContain('6,100');
    await click('scores-coop');
    await click('scores-god-hades');
    expect(urls.at(-1)).toBe('https://olympus.example/api/leaderboards/coop?limit=10&god=hades');
  });

  it("shows the world's best Daily Trial score today", async () => {
    const { el, settle, urls } = world([{ ...entry, names: ['Cy'], score: 4200 }]);
    await settle();
    expect(urls[0]).toContain('/api/leaderboards/daily?limit=10&date=');
    expect(el.querySelector('[data-testid=glory-trial-world]')?.textContent).toContain(
      '4,200 by Cy',
    );
  });

  it('says when the game server is unavailable, and keeps this device’s tables', async () => {
    const { el, click } = world([], true);
    await click('scores-world');
    expect(el.querySelector('[data-testid=world-status]')?.textContent).toContain(
      'game server is unavailable',
    );
    await click('scores-device');
    expect(el.querySelector('[data-testid=world-table]')).toBeNull();
  });
});
