import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { AppUpdate } from '../core/app-update';
import { Connectivity } from '../core/connectivity';
import { InstallPrompt } from '../core/install-prompt';
import { Progression } from '../core/progression';
import { RunSetup } from '../core/run-setup';
import { localDate } from '../core/save/glory';
import { SAVE_KEY, SAVE_STORAGE } from '../core/save/save-store';
import { parseSeed } from '../core/run-setup';
import { RunResult } from '../../engine';

function storageWith(save?: object) {
  const data: Record<string, string> = save ? { [SAVE_KEY]: JSON.stringify(save) } : {};
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}

async function open(url: string, save?: object, prepare?: () => void) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: SAVE_STORAGE, useValue: storageWith(save) }],
  });
  prepare?.();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness;
}

const text = (h: RouterTestingHarness) => (h.routeNativeElement as HTMLElement).textContent ?? '';
const q = <T extends Element>(h: RouterTestingHarness, selector: string) =>
  (h.routeNativeElement as HTMLElement).querySelector<T>(selector);

describe('main menu', () => {
  it('shows Play, Progression, Settings and the gold total', async () => {
    const h = await open('/', { version: 2, gold: 75, introSeen: true });
    expect(text(h)).toContain('Play');
    expect(text(h)).toContain('Progression');
    expect(text(h)).toContain('Settings');
    expect(q(h, '[data-testid=menu-gold]')?.textContent).toBe('75');
  });

  it('shows the next goal and leads to it (spec: run-setup / main menu)', async () => {
    // Today's trial already played, so the blessing comes first.
    const today = localDate(new Date());
    const h = await open('/', {
      version: 8,
      gold: 150,
      introSeen: true,
      dailyTrial: { date: today, attempts: 1 },
    });
    const goal = q<HTMLAnchorElement>(h, '[data-testid=next-goal]');
    expect(goal?.textContent).toContain('Buy Attraction I');
    expect(goal?.textContent).toContain('80 gold');
    goal?.click();
    await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/progression');
  });
});

describe('installing and updating (spec: installable-app)', () => {
  const returning = { version: 2, introSeen: true };

  it('offers to install the game where the browser can, until dismissed', async () => {
    const h = await open('/', returning, () => TestBed.inject(InstallPrompt).canPrompt.set(true));
    expect(q(h, '[data-testid=install-game]')).toBeTruthy();
    q<HTMLButtonElement>(h, '[aria-label="Not now"]')?.click();
    await h.fixture.whenStable();
    expect(q(h, '[data-testid=install-hint]')).toBeNull();
  });

  it('shows no install hint in the installed game', async () => {
    const h = await open('/', returning, () => {
      const install = TestBed.inject(InstallPrompt);
      install.canPrompt.set(true);
      install.installed.set(true);
    });
    expect(q(h, '[data-testid=install-hint]')).toBeNull();
    expect(q(h, '[data-testid=install-ios]')).toBeNull();
  });

  it('offers to reload into a new version', async () => {
    const h = await open('/', returning, () => TestBed.inject(AppUpdate).ready.set(true));
    expect(q(h, '[data-testid=update-ready]')?.textContent).toContain('A new version is ready');
  });

  it('keeps rooms closed while offline', async () => {
    const h = await open('/coop', returning, () => TestBed.inject(Connectivity).online.set(false));
    expect(q(h, '[data-testid=offline]')?.textContent).toContain('need an internet connection');
    expect(q<HTMLButtonElement>(h, '[data-testid=create-room]')?.disabled).toBe(true);
    TestBed.inject(Connectivity).online.set(true);
    await h.fixture.whenStable();
    expect(q(h, '[data-testid=offline]')).toBeNull();
  });
});

describe('god selection', () => {
  it('offers only the defined gods and continues with the choice', async () => {
    const h = await open('/gods');
    const cards = (h.routeNativeElement as HTMLElement).querySelectorAll('[data-testid^=god-]');
    expect([...cards].map((c) => c.getAttribute('data-testid'))).toEqual([
      'god-zeus',
      'god-hades',
      'god-poseidon',
      'god-athena',
    ]);
    expect(text(h)).toContain('Thunder Spear');
    expect(text(h)).toContain('Wrath of Olympus');
    const continueButton = [
      ...(h.routeNativeElement as HTMLElement).querySelectorAll('button'),
    ].find((b) => b.textContent?.includes('Continue'));
    continueButton?.click();
    await h.fixture.whenStable();
    expect(TestBed.inject(RunSetup).godId()).toBe('zeus');
    expect(TestBed.inject(Router).url).toBe('/realms');
  });
});

describe('god selection on a phone (spec: phone-play / co-op on a phone)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('offers bot allies but no players at this screen', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(pointer: coarse)',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const h = await open('/gods');
    expect(q(h, '[data-testid=players]')).toBeNull();
    expect(q(h, '[data-testid=allies]')).toBeTruthy();
  });
});

describe('realm selection', () => {
  it('offers a full or a quick run, with the boss times (spec: run-setup / realm selection)', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: SAVE_STORAGE, useValue: storageWith() }],
    });
    TestBed.inject(RunSetup).godId.set('zeus');
    const h = await RouterTestingHarness.create();
    await h.navigateByUrl('/realms');
    expect(q(h, '[data-testid=length-full]')?.textContent).toContain('7:00');
    const quick = q<HTMLButtonElement>(h, '[data-testid=length-quick]');
    expect(quick?.textContent).toContain('3:30');
    quick?.click();
    await h.fixture.whenStable();
    expect(TestBed.inject(RunSetup).quick()).toBe(true);
    expect(quick?.getAttribute('aria-checked')).toBe('true');
  });

  it('starts a run with the chosen seed', async () => {
    const h = await open('/gods');
    TestBed.inject(RunSetup).godId.set('zeus');
    await h.navigateByUrl('/realms');
    const input = q<HTMLInputElement>(h, '[data-testid=seed-input]');
    if (!input) throw new Error('no seed input');
    input.value = '847291';
    input.dispatchEvent(new Event('input'));
    h.detectChanges();
    const setup = TestBed.inject(RunSetup);
    // Navigation to /play is lazy; only the setup matters here.
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    q<HTMLButtonElement>(h, '[data-testid=begin]')?.click();
    expect(setup.realmId()).toBe('mount_olympus');
    expect(setup.seed()).toBe(847291);
    expect(navigate).toHaveBeenCalledWith(['/play']);
  });

  it('disables Begin and explains an invalid seed', async () => {
    const h = await open('/gods');
    TestBed.inject(RunSetup).godId.set('zeus');
    await h.navigateByUrl('/realms');
    const input = q<HTMLInputElement>(h, '[data-testid=seed-input]');
    if (!input) throw new Error('no seed input');
    for (const bad of ['abc', '-5', '4294967296']) {
      input.value = bad;
      input.dispatchEvent(new Event('input'));
      h.detectChanges();
      expect(q<HTMLButtonElement>(h, '[data-testid=begin]')?.disabled).toBe(true);
      expect(text(h)).toContain('whole number from 0 to 4294967295');
    }
  });

  it('parses seeds strictly', () => {
    expect(parseSeed(' 42 ')).toBe(42);
    expect(parseSeed('4294967295')).toBe(4294967295);
    expect(parseSeed('1.5')).toBeUndefined();
    expect(parseSeed('')).toBeUndefined();
  });
});

describe('route guards', () => {
  it('sends a direct visit to the play screen to god selection', async () => {
    await open('/play');
    expect(TestBed.inject(Router).url).toBe('/gods');
  });

  it('sends a summary visit without a finished run to the menu', async () => {
    await open('/summary', { version: 2, introSeen: true });
    expect(TestBed.inject(Router).url).toBe('/');
  });
});

describe('progression screen', () => {
  it('buys an affordable upgrade and disables unaffordable ones', async () => {
    const h = await open('/progression', {
      version: 1,
      gold: 120,
      discovered: { weapons: ['war_hammer'] },
    });
    const buyVitality = q<HTMLButtonElement>(h, '[data-testid=buy-vitality]');
    const buyMight = q<HTMLButtonElement>(h, '[data-testid=buy-might]');
    expect(buyMight?.disabled).toBe(true);
    buyVitality?.click();
    h.detectChanges();
    expect(q(h, '[data-testid=progression-gold]')?.textContent).toBe('20');
    expect(q(h, '[data-testid=codex-war_hammer]')?.getAttribute('data-known')).toBe('true');
    expect(q(h, '[data-testid=codex-trident]')?.getAttribute('data-known')).toBe('false');
  });

  it('shows the codex one kind at a time, with the pointed item described', async () => {
    const h = await open('/progression', {
      version: 1,
      discovered: { weapons: ['war_hammer'], relics: ['golden_fleece'] },
    });
    q<HTMLButtonElement>(h, '[data-testid=codex-war_hammer]')?.click();
    h.detectChanges();
    expect(q(h, '[data-testid=codex-detail]')?.textContent).toContain('War Hammer');
    expect(q(h, '[data-testid=codex-golden_fleece]')).toBeNull();
    q<HTMLButtonElement>(h, '[data-testid=codex-tab-relics]')?.click();
    h.detectChanges();
    expect(q(h, '[data-testid=codex-golden_fleece]')?.getAttribute('data-known')).toBe('true');
    expect(q(h, '[data-testid=codex-war_hammer]')).toBeNull();
  });

  it('shows discovered and undiscovered fusions (spec: meta-progression / codex and statistics)', async () => {
    const h = await open('/progression', {
      version: 10,
      discovered: { fusions: ['forge_of_hephaestus'] },
    });
    q<HTMLButtonElement>(h, '[data-testid=codex-tab-fusions]')?.click();
    h.detectChanges();
    expect(q(h, '[data-testid=codex-forge_of_hephaestus]')?.getAttribute('data-known')).toBe(
      'true',
    );
    expect(q(h, '[data-testid=codex-apotheosis]')?.getAttribute('data-known')).toBe('false');
  });

  it('shows each god’s four looks (spec: god-appearance / previews)', async () => {
    const h = await open('/progression', { version: 10 });
    q<HTMLButtonElement>(h, '[data-testid=codex-tab-gods]')?.click();
    h.detectChanges();
    q<HTMLButtonElement>(h, '[data-testid=codex-hades]')?.click();
    h.detectChanges();
    expect(q(h, '[data-testid=codex-detail]')?.textContent).toContain('Hades');
    expect(q(h, '[data-testid=codex-looks]')?.querySelectorAll('app-item-icon')).toHaveLength(4);
    // The skins beside them, the default first; a fresh save has the others locked.
    const skins = q(h, '[data-testid=codex-skins]')?.querySelectorAll('app-item-icon') ?? [];
    expect(skins.length).toBe(5);
    expect(skins[0].classList.contains('locked')).toBe(false);
    expect([...skins].slice(1).every((s) => s.classList.contains('locked'))).toBe(true);
    expect(q(h, '[data-testid=codex-skin-hades_shroud]')?.getAttribute('title')).toContain(
      'Night of Hecate shop',
    );
  });
});

describe('settings screen', () => {
  it('persists toggles', async () => {
    const storage = storageWith();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: SAVE_STORAGE, useValue: storage }],
    });
    const h = await RouterTestingHarness.create('/settings');
    const numbers = q<HTMLInputElement>(h, '[data-testid=damage-numbers]');
    if (!numbers) throw new Error('missing toggle');
    numbers.checked = false;
    numbers.dispatchEvent(new Event('change'));
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '{}').settings.damageNumbers).toBe(false);
  });

  it("remembers the player's name for challenges and co-op", async () => {
    const storage = storageWith();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: SAVE_STORAGE, useValue: storage }],
    });
    const h = await RouterTestingHarness.create('/settings');
    const name = q<HTMLInputElement>(h, '[data-testid=settings-name]');
    if (!name) throw new Error('missing name field');
    name.value = '  Ada ';
    name.dispatchEvent(new Event('change'));
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '{}').playerName).toBe('Ada');
  });

  it('keeps the credits behind a button, grouped by work', async () => {
    const h = await open('/settings');
    const dialog = q<HTMLDialogElement>(h, '[data-testid=credits]');
    expect(dialog?.hasAttribute('open')).toBe(false);
    q<HTMLButtonElement>(h, '[data-testid=credits-button]')?.click();
    h.detectChanges();
    expect(dialog?.hasAttribute('open')).toBe(true);
    const titles = [...(dialog?.querySelectorAll(':scope > ul > li .work strong') ?? [])].map(
      (el) => el.textContent ?? '',
    );
    // Many sheets share Clint Bellanger's hero model: one entry, with each use listed under it.
    expect(titles.filter((t) => t === 'Isometric Hero and Heroine').length).toBe(1);
    expect(titles).toContain('Cinzel');
    q<HTMLButtonElement>(h, '[aria-label="Close credits"]')?.click();
    expect(dialog?.hasAttribute('open')).toBe(false);
  });
});

describe('graphics quality', () => {
  it('persists the chosen quality', async () => {
    const data: Record<string, string> = {};
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: SAVE_STORAGE,
          useValue: {
            getItem: (k: string) => data[k] ?? null,
            setItem: (k: string, v: string) => void (data[k] = v),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create('/settings');
    q<HTMLButtonElement>(h, '[data-testid=quality-high]')?.click();
    h.detectChanges();
    expect(JSON.parse(data[SAVE_KEY]).settings.quality).toBe('high');
    expect(q(h, '[data-testid=quality-high]')?.getAttribute('aria-checked')).toBe('true');
  });
});

describe('Daily Trial screens (spec: daily-trial)', () => {
  const returning = { version: 2, introSeen: true };

  it('leads from the menu, by its button and the next goal, until played today', async () => {
    const h = await open('/', returning);
    expect(q(h, '[data-testid=menu-daily-trial] .dot')).toBeTruthy();
    expect(q(h, '[data-testid=next-goal]')?.textContent).toContain("Today's Daily Trial");
    q<HTMLAnchorElement>(h, '[data-testid=next-goal]')?.click();
    await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/daily');
  });

  it("shows today's trial and begins it, solo, with its own seed", async () => {
    const h = await open('/daily', returning);
    const trial = TestBed.inject(Progression).trialToday().trial;
    expect(q(h, '[data-testid=trial-twist]')?.textContent).toContain(trial.twist.name);
    expect(q(h, '[data-testid=trial-best]')?.textContent).toContain('Not played yet today');
    q<HTMLButtonElement>(h, '[data-testid=trial-begin]')?.click();
    await h.fixture.whenStable();
    const setup = TestBed.inject(RunSetup);
    expect(setup.special()).toEqual({ kind: 'daily', trial });
    expect(setup.seed()).toBe(trial.seed);
    expect(setup.godId()).toBe(trial.godId);
  });

  it('opens a challenge link and accepts it', async () => {
    const h = await open('/challenge?g=hades&r=the_underworld&s=991&q=1&b=3400', returning);
    expect(q(h, '[data-testid=challenge-title]')?.textContent).toContain('A challenge');
    expect(q(h, '[data-testid=challenge-god]')?.textContent).toContain('Hades');
    expect(q(h, '[data-testid=challenge-to-beat]')?.textContent).toContain('3,400');
    q<HTMLButtonElement>(h, '[data-testid=challenge-accept]')?.click();
    await h.fixture.whenStable();
    const special = TestBed.inject(RunSetup).special();
    expect(special?.kind === 'challenge' && special.challenge).toMatchObject({
      godId: 'hades',
      seed: 991,
      quick: true,
      toBeat: 3400,
    });
  });

  it('names who sent the challenge', async () => {
    const h = await open('/challenge?g=hades&r=the_underworld&s=991&b=3400&n=Ada', returning);
    expect(q(h, '[data-testid=challenge-title]')?.textContent).toContain('Ada challenges you');
    expect(text(h)).toContain('Ada played this run');
  });

  it('sends a broken challenge link to the main menu', async () => {
    const h = await open('/challenge?g=nobody&r=the_underworld&s=1', returning);
    await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it("shows today's trial in the Hall of Glory", async () => {
    const h = await open('/glory', returning);
    const trial = TestBed.inject(Progression).trialToday().trial;
    expect(q(h, '[data-testid=glory-trial]')?.textContent).toContain(trial.twist.name);
  });
});

describe('run summary sharing (spec: daily-trial / sharing a run)', () => {
  it('shares the challenge link on its own button, copied where there is no share sheet', async () => {
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void (copied = text) },
    });
    try {
      const h = await open('/', { version: 9, introSeen: true, playerName: 'Ada' });
      const result: RunResult = {
        runId: 'run-share',
        godId: 'zeus',
        realmId: 'mount_olympus',
        seed: 77,
        outcome: 'defeat',
        timeSeconds: 120,
        level: 5,
        kills: 90,
        gold: 10,
        realmsCleared: 0,
        realmReached: 'mount_olympus',
        players: 1,
        bots: 0,
        loadout: { weapons: [], relics: [], skills: [], synergies: [], fusions: [] },
      };
      const rewards = TestBed.inject(Progression).recordRun(result);
      TestBed.inject(RunSetup).lastRun.set({ result, rewards });
      await h.navigateByUrl('/summary');
      expect(q(h, '[data-testid=share-picture]')?.textContent).toContain('Share picture');
      q<HTMLButtonElement>(h, '[data-testid=share-link]')?.click();
      await new Promise((r) => setTimeout(r, 10));
      h.detectChanges();
      expect(copied).toMatch(/^Ada scored [\d,]+ as Zeus in Olympus Unbound\. Can you beat it\? /);
      expect(copied).toContain('/challenge?g=zeus&r=mount_olympus&s=77');
      expect(copied).toContain('n=Ada');
      expect(q(h, '[data-testid=share-status]')?.textContent).toContain('Challenge link copied.');
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });
});
