import { expect, Page } from '@playwright/test';

type DebugAction =
  | { type: 'grantXp'; amount: number }
  | { type: 'skipTo'; seconds: number }
  | { type: 'damageBoss'; fraction: number }
  | { type: 'killPlayer'; slot?: number }
  | { type: 'travel' }
  | { type: 'godMode'; enabled: boolean };

export interface Snapshot {
  phase: string;
  time: number;
  player: { x: number; y: number; health: number };
  enemies: number;
  bossAlive: boolean;
  players: number;
  party: { x: number; y: number; alive: boolean }[];
  depth: number;
}

/** The development-only hooks the play screen installs with `?debug`. */
interface DebugWindow {
  olympusDebug?: { send(action: DebugAction): void; inspect(): Snapshot | undefined };
}

/**
 * Opens the game as a returning player: the intro already seen and graphics pinned to Low, so runs stay fast with
 * software rendering (CI).
 */
export async function openAsReturningPlayer(page: Page, save: object = {}): Promise<void> {
  await page.addInitScript((extra) => {
    if (localStorage.getItem('olympus-unbound/save')) return;
    const save = { version: 2, introSeen: true, settings: { quality: 'low' }, ...extra };
    localStorage.setItem('olympus-unbound/save', JSON.stringify(save));
  }, save);
  await page.goto('/?debug');
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
}

/** Menu → Zeus → Mount Olympus with a fixed seed; returns once the game is running. */
export async function startRun(page: Page, seed = '847291'): Promise<void> {
  await openAsReturningPlayer(page);
  await page.getByRole('link', { name: 'Play' }).click();
  await page.getByTestId('god-zeus').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('seed-input').fill(seed);
  await page.getByTestId('begin').click();
  // The game (a lazy chunk) boots and its loading screen (art, then the painted realm) ends before the clock
  // starts; without a GPU (CI) or with parallel workers, booting, painting and the first frames are slow.
  await expect(page.locator('[data-testid=game-host] canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect
    .poll(() => inspect(page).then((s) => s?.time ?? 0), { timeout: 30_000 })
    .toBeGreaterThan(0.5);
}

export function debug(page: Page, action: DebugAction): Promise<void> {
  return page.evaluate((a) => (window as DebugWindow).olympusDebug?.send(a), action);
}

export function inspect(page: Page): Promise<Snapshot | undefined> {
  return page.evaluate(() => (window as DebugWindow).olympusDebug?.inspect());
}
