import { expect, Page, test } from '@playwright/test';
import { debug, fillSeed, inspect, openAsReturningPlayer } from './run';

/** Co-op with a name, through the game server Playwright starts (D21). */
async function openCoop(page: Page, name: string): Promise<void> {
  await openAsReturningPlayer(page);
  await page.goto('/coop?debug');
  await page.getByTestId('player-name').fill(name);
}

test('Quick Play pairs two players through an open room (spec: matchmaking)', async ({
  context,
}) => {
  test.setTimeout(120_000);
  const first = await context.newPage();
  const second = await context.newPage();

  // Nobody waits: Quick Play opens a public room.
  await openCoop(first, 'Ada');
  await first.getByTestId('quick-play').click();
  const code = ((await first.getByTestId('room-code').textContent()) ?? '').trim();
  expect(code).toMatch(/^[A-Z2-9]{5}$/);
  await expect(first.getByTestId('public-room')).toBeChecked();

  // The second player sees it among the open rooms, and Quick Play joins it.
  await openCoop(second, 'Bo');
  await second.getByTestId('refresh-rooms').click();
  await expect(second.getByTestId(`open-room-${code}`)).toContainText('Ada');
  await second.getByTestId('quick-play').click();
  await expect(second.getByTestId('room-code')).toHaveText(code);
  await expect(first.getByTestId('member-1')).toContainText('Bo');

  // Private again: it leaves the list.
  await first.getByTestId('public-room').uncheck();
  const third = await context.newPage();
  await openCoop(third, 'Cy');
  await third.getByTestId('refresh-rooms').click();
  await expect(third.getByTestId(`open-room-${code}`)).toHaveCount(0);
});

test('a finished run shows on the World table (spec: world-leaderboards)', async ({ page }) => {
  test.setTimeout(180_000);
  // A name of its own, and a god the other tests leave alone, so its row is easy to find.
  await openAsReturningPlayer(page, { version: 9, playerName: 'Zephyra' });
  await page.getByRole('link', { name: 'Play' }).click();
  await page.getByTestId('god-athena').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await fillSeed(page, '5150');
  await page.getByTestId('begin').click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect
    .poll(async () => (await inspect(page))?.time ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(1);
  await debug(page, { type: 'killPlayer' });
  await expect(page).toHaveURL(/\/summary$/, { timeout: 20_000 });

  await page.goto('/glory?debug');
  await page.getByTestId('scores-world').click();
  await page.getByTestId('scores-god-athena').click();
  await expect(page.getByTestId('world-table')).toContainText('Zephyra', { timeout: 15_000 });
});
