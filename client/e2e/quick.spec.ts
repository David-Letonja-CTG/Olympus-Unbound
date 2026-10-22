import { expect, test } from '@playwright/test';
import { debug, fillSeed, inspect, openAsReturningPlayer } from './run';

test('a quick run: the boss at 3:30, and its own table in the Hall of Glory (spec: quick-runs)', async ({
  page,
}) => {
  await openAsReturningPlayer(page);
  await page.getByRole('link', { name: 'Play' }).click();
  await page.getByTestId('god-zeus').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('length-quick').click();
  await fillSeed(page, '31337');
  await page.getByTestId('begin').click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect
    .poll(async () => (await inspect(page))?.time ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(0.5);
  await debug(page, { type: 'godMode', enabled: true });

  // The realm's clock runs twice as fast: just before its 7:00 the run's timer reads 3:29.
  await debug(page, { type: 'skipTo', seconds: 419 });
  await expect(page.getByTestId('boss-bar')).toBeVisible({ timeout: 30_000 });
  const time = (await inspect(page))?.time ?? 0;
  expect(time).toBeGreaterThan(209);
  expect(time).toBeLessThan(240);

  await debug(page, { type: 'godMode', enabled: false });
  await debug(page, { type: 'killPlayer' });
  await expect(page).toHaveURL(/summary/, { timeout: 30_000 });
  await expect(page.getByTestId('summary-high-score')).toContainText('New quick high score');

  await page.getByTestId('to-menu').click();
  await page.getByTestId('menu-glory').click();
  await page.getByTestId('scores-quick').click();
  await expect(page.getByTestId('scores-table').locator('tbody tr')).toHaveCount(1);
  await page.getByTestId('scores-solo').click();
  await expect(page.getByTestId('scores-table')).toContainText('No runs here yet');
});
