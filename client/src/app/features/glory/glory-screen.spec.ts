import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RunResult } from '../../../engine';
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
  loadout: { weapons: [], relics: [], skills: [], synergies: [] },
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
