import { expect, Page } from '@playwright/test';

type DebugAction =
  | { type: 'grantXp'; amount: number }
  | { type: 'skipTo'; seconds: number }
  | { type: 'damageBoss'; fraction: number }
  | { type: 'killPlayer' }
  | { type: 'godMode'; enabled: boolean };

export interface Snapshot {
  phase: string;
  time: number;
  player: { x: number; y: number; health: number };
  enemies: number;
  bossAlive: boolean;
}

/** The development-only hooks the play screen installs with `?debug`. */
interface DebugWindow {
  olympusDebug?: { send(action: DebugAction): void; inspect(): Snapshot | undefined };
}

/** Menu → Zeus → Mount Olympus with a fixed seed; returns once the game is running. */
export async function startRun(page: Page, seed = '847291'): Promise<void> {
  await page.goto('/?debug');
  await page.getByRole('link', { name: 'Play' }).click();
  await page.getByTestId('god-zeus').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('seed-input').fill(seed);
  await page.getByTestId('begin').click();
  await expect(page.locator('[data-testid=game-host] canvas')).toBeVisible();
  await expect.poll(() => inspect(page).then((s) => s?.time ?? 0)).toBeGreaterThan(0.5);
}

export function debug(page: Page, action: DebugAction): Promise<void> {
  return page.evaluate((a) => (window as DebugWindow).olympusDebug?.send(a), action);
}

export function inspect(page: Page): Promise<Snapshot | undefined> {
  return page.evaluate(() => (window as DebugWindow).olympusDebug?.inspect());
}
