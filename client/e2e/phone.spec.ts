import { CDPSession, expect, Page, test } from '@playwright/test';
import { debug, inspect, startRun } from './run';

/** One finger on the screen, through Chromium's touch input (so the page sees real touch pointer events). */
async function touch(cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
  });
}

async function playerX(page: Page): Promise<number> {
  return (await inspect(page))?.player.x ?? 0;
}

test('a run on a phone: moving, dashing and pausing by touch (spec: phone-play)', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startRun(page);
  await debug(page, { type: 'godMode', enabled: true });
  await expect(page.getByTestId('touch-controls')).toBeVisible();

  // The stick: a thumb lands on the left and drags right; Zeus walks right.
  const cdp = await page.context().newCDPSession(page);
  const height = page.viewportSize()?.height ?? 360;
  const start = await playerX(page);
  await touch(cdp, 'touchStart', 140, height - 120);
  await expect(page.getByTestId('touch-stick')).toBeVisible();
  for (let dx = 10; dx <= 70; dx += 10) await touch(cdp, 'touchMove', 140 + dx, height - 120);
  await expect
    .poll(async () => (await playerX(page)) - start, { timeout: 20_000 })
    .toBeGreaterThan(40);
  await touch(cdp, 'touchEnd');
  await expect(page.getByTestId('touch-stick')).toBeHidden();

  // Lifting the thumb stops him.
  await expect
    .poll(
      async () => {
        const a = await playerX(page);
        await page.waitForTimeout(300);
        return Math.abs((await playerX(page)) - a);
      },
      { timeout: 20_000 },
    )
    .toBeLessThan(1);

  // The dash button carries him well beyond a step the way he faces.
  const beforeDash = await playerX(page);
  await page.getByTestId('touch-dash').tap();
  await expect
    .poll(async () => (await playerX(page)) - beforeDash, { timeout: 20_000 })
    .toBeGreaterThan(100);

  // The on-screen pause button opens the pause menu; Resume goes back to the fight.
  await page.getByTestId('touch-pause').tap();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  expect((await inspect(page))?.phase).toBe('paused');
  await page.getByTestId('resume').tap();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toHaveCount(0);

  // A level-up choice fits the landscape phone and is answered by a tap.
  await debug(page, { type: 'grantXp', amount: 5 });
  const offer = page.getByTestId('offer-0');
  await expect(offer).toBeInViewport();
  await page.waitForTimeout(350);
  await offer.tap();
  await expect(offer).toHaveCount(0);

  expect(errors).toEqual([]);
});
