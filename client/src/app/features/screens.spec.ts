import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
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

async function open(url: string, save?: object) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: SAVE_STORAGE, useValue: storageWith(save) }],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness;
}

const text = (h: RouterTestingHarness) => (h.routeNativeElement as HTMLElement).textContent ?? '';
const q = <T extends Element>(h: RouterTestingHarness, selector: string) =>
  (h.routeNativeElement as HTMLElement).querySelector<T>(selector);

describe('main menu', () => {
  it('shows Play, Progression, Settings and the gold total', async () => {
    const h = await open('/', { version: 1, gold: 75 });
    expect(text(h)).toContain('Play');
    expect(text(h)).toContain('Progression');
    expect(text(h)).toContain('Settings');
    expect(q(h, '[data-testid=menu-gold]')?.textContent).toBe('75');
  });
});

describe('god selection', () => {
  it('offers only the defined gods and continues with the choice', async () => {
    const h = await open('/gods');
    const cards = (h.routeNativeElement as HTMLElement).querySelectorAll('[data-testid^=god-]');
    expect([...cards].map((c) => c.getAttribute('data-testid'))).toEqual(['god-zeus']);
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
    await open('/summary');
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
});
