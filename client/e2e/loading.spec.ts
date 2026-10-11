import { expect, test } from '@playwright/test';
import { inspect, openAsReturningPlayer } from './run';

test('a run opens on its loading screen with the realm and the party, then the arena', async ({
  page,
}) => {
  await openAsReturningPlayer(page);
  await page.getByRole('link', { name: 'Play' }).click();
  await page.getByTestId('god-hades').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('begin').click();

  const loading = page.getByTestId('run-loading');
  await expect(loading).toBeVisible();
  await expect(loading.getByRole('heading', { name: 'Mount Olympus' })).toBeVisible();
  await expect(loading.getByTestId('party-member')).toHaveCount(1);
  await expect(loading.getByTestId('party-member')).toContainText('You');
  await expect(loading.getByTestId('party-member')).toContainText('Hades');
  await expect(loading.getByText(/room/i)).toHaveCount(0);

  // Once the arena is ready the screen fades away and the run starts at 00:00.
  await expect(loading).toHaveCount(0, { timeout: 60_000 });
  await expect
    .poll(() => inspect(page).then((s) => s?.time ?? 0), { timeout: 30_000 })
    .toBeGreaterThan(0.5);
});
