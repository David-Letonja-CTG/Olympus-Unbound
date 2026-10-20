import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { AppUpdate } from '../core/app-update';
import { Connectivity } from '../core/connectivity';
import { InstallPrompt } from '../core/install-prompt';
import { RunSetup } from '../core/run-setup';
import { SAVE_KEY, SAVE_STORAGE } from '../core/save/save-store';
import { parseSeed } from '../core/run-setup';

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
    const h = await open('/', { version: 2, gold: 150, introSeen: true });
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
