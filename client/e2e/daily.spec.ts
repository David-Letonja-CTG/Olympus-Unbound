import { expect, test } from '@playwright/test';
import { debug, inspect, openAsReturningPlayer } from './run';

test("the Daily Trial: today's run, its best, a share and a challenge link (spec: daily-trial)", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openAsReturningPlayer(page);

  // The menu points at today's trial until it is played.
  await expect(page.getByTestId('next-goal')).toContainText("Today's Daily Trial");
  await page.getByTestId('menu-daily-trial').click();
  const twist = (await page.getByTestId('trial-twist').locator('h2').textContent())?.trim() ?? '';
  expect(twist).not.toBe('');
  await page.getByTestId('trial-begin').click();
  await expect(page.getByTestId('loading-twist')).toContainText(twist);
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect
    .poll(async () => (await inspect(page))?.time ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(1);
  await debug(page, { type: 'killPlayer' });
  await expect(page).toHaveURL(/summary/, { timeout: 30_000 });
  await expect(page.getByTestId('summary-kind')).toContainText('Daily Trial');
  await expect(page.getByTestId('summary-kind')).toContainText(twist);
  await expect(page.getByTestId('summary-trial')).toContainText('New best today');
  await expect(page.getByTestId('summary-high-score')).toHaveCount(0);

  // Desktop Chromium cannot share files: the picture is saved and the challenge link copied.
  const download = page.waitForEvent('download');
  await page.getByTestId('share').click();
  expect((await download).suggestedFilename()).toBe('olympus-unbound.png');
  await expect(page.getByTestId('share-status')).toContainText('challenge link copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const link = copied.match(/https?:\/\/\S+/)?.[0] ?? '';
  expect(link).toContain('/challenge?');

  // The Hall of Glory and the menu know the trial is played.
  await page.getByTestId('to-menu').click();
  await expect(page.getByTestId('next-goal')).not.toContainText("Today's Daily Trial");
  await page.getByTestId('menu-glory').click();
  await expect(page.getByTestId('glory-trial-best')).toContainText('Best today');

  // A friend opens the link: the same god, realm, seed and twist.
  await page.goto(`${new URL(link).pathname}${new URL(link).search}&debug`);
  await expect(page.getByTestId('challenge-twist')).toContainText(twist);
  await page.getByTestId('challenge-accept').click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect
    .poll(async () => (await inspect(page))?.time ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(0.5);
});
