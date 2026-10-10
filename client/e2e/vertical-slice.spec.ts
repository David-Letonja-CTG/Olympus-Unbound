import { expect, test } from '@playwright/test';
import { debug, inspect, startRun } from './run';

test('the vertical slice: menu → Zeus → Olympus → level-up → elite → boss → victory → summary → menu', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await startRun(page);
  await debug(page, { type: 'godMode', enabled: true });

  // Moving: holding D moves Zeus right at his speed (210 per simulated second; headless browsers render
  // slowly, so compare against simulated time, not wall time).
  const before = await inspect(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(1000);
  const after = await inspect(page);
  await page.keyboard.up('d');
  const dt = (after?.time ?? 0) - (before?.time ?? 0);
  expect(dt).toBeGreaterThan(0.1);
  expect(((after?.player.x ?? 0) - (before?.player.x ?? 0)) / dt).toBeGreaterThan(170);

  // Enemies spawn and are fought.
  await expect.poll(async () => (await inspect(page))?.enemies ?? 0).toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await page.getByTestId('hud-kills').textContent()), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);

  // Level-up: the run pauses and a keyboard pick changes the build.
  await debug(page, { type: 'grantXp', amount: 5 });
  await expect(page.getByRole('dialog', { name: 'Level 2!' })).toBeVisible();
  expect((await inspect(page))?.phase).toBe('choosing');
  await page.waitForTimeout(350);
  await page.keyboard.press('1');
  await expect(page.getByTestId('offer-0')).toHaveCount(0);
  expect((await inspect(page))?.phase).toBe('playing');

  // Pressure: the first elite arrives at 02:00.
  await debug(page, { type: 'skipTo', seconds: 119 });
  await expect(page.getByText(/An elite .* approaches!/)).toBeVisible({ timeout: 10_000 });

  // The boss at 07:00.
  await debug(page, { type: 'skipTo', seconds: 419 });
  await expect(page.getByTestId('boss-bar')).toContainText('The Cyclops', { timeout: 10_000 });

  // Defeat the boss → victory → summary with rewards.
  await debug(page, { type: 'damageBoss', fraction: 1 });
  await expect(page.getByRole('status')).toHaveText('Victory');
  await expect(page).toHaveURL(/\/summary$/, { timeout: 10_000 });
  await expect(page.getByTestId('summary-outcome')).toHaveText('Victory');
  const earned = Number(await page.getByTestId('summary-gold').textContent());
  expect(earned).toBeGreaterThanOrEqual(250);

  // Back to the menu; the gold persists across a reload.
  await page.getByTestId('to-menu').click();
  await expect(page.getByTestId('menu-gold')).toHaveText(String(earned));
  await page.reload();
  await expect(page.getByTestId('menu-gold')).toHaveText(String(earned));

  expect(errors).toEqual([]);
});

test('defeat ends the run and shows the summary', async ({ page }) => {
  await startRun(page, '12345');
  await debug(page, { type: 'killPlayer' });
  await expect(page).toHaveURL(/\/summary$/, { timeout: 10_000 });
  await expect(page.getByTestId('summary-outcome')).toHaveText('Defeat');
});

test('pausing stops time; abandoning needs a confirmation', async ({ page }) => {
  await startRun(page, '777');
  await debug(page, { type: 'godMode', enabled: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  const paused = (await inspect(page))?.time ?? 0;
  await page.waitForTimeout(800);
  expect((await inspect(page))?.time).toBe(paused);

  // Escape resumes.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toHaveCount(0);
  await expect.poll(async () => (await inspect(page))?.time ?? 0).toBeGreaterThan(paused);

  await page.keyboard.press('Escape');
  await page.getByTestId('abandon').click();
  await page.getByTestId('abandon-cancel').click();
  expect((await inspect(page))?.phase).toBe('paused');
  await page.getByTestId('abandon').click();
  await page.getByTestId('abandon-confirm').click();
  await expect(page).toHaveURL(/\/summary$/, { timeout: 10_000 });
  await expect(page.getByTestId('summary-outcome')).toHaveText('Run abandoned');
});

test('permanent upgrades are bought with gold and kept', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('olympus-unbound/save', JSON.stringify({ version: 1, gold: 150 })),
  );
  await page.goto('/progression');
  await expect(page.getByTestId('progression-gold')).toHaveText('150');
  await page.getByTestId('buy-vitality').click();
  await expect(page.getByTestId('progression-gold')).toHaveText('50');
  await expect(page.getByTestId('buy-might')).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('progression-gold')).toHaveText('50');
});
