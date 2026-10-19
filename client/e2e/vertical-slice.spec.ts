import { expect, test } from '@playwright/test';
import { debug, inspect, openAsReturningPlayer, startRun } from './run';

test('the vertical slice: menu → Zeus → Olympus → level-up → elite → boss → gate → realm 2 → death → summary → menu', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await startRun(page);
  await debug(page, { type: 'godMode', enabled: true });

  // Moving: holding D moves Zeus right at his speed (210 per simulated second). Measured between two samples
  // taken while he is already moving, against simulated time: without a GPU (CI) frames are slow, and the
  // frame that registers the key press would otherwise count as time spent standing still.
  const start = await inspect(page);
  await page.keyboard.down('d');
  await expect
    .poll(async () => ((await inspect(page))?.player.x ?? 0) - (start?.player.x ?? 0), {
      timeout: 20_000,
    })
    .toBeGreaterThan(1);
  const a = await inspect(page);
  await expect
    .poll(async () => ((await inspect(page))?.time ?? 0) - (a?.time ?? 0), { timeout: 20_000 })
    .toBeGreaterThan(0.5);
  const b = await inspect(page);
  await page.keyboard.up('d');
  const speed = ((b?.player.x ?? 0) - (a?.player.x ?? 0)) / ((b?.time ?? 0) - (a?.time ?? 1));
  expect(speed).toBeGreaterThan(190);
  expect(speed).toBeLessThan(215);

  // Dash: E carries Zeus well beyond a step the way he faces (spec: player-control / stamina, sprint and dash).
  const beforeDash = await inspect(page);
  await page.keyboard.press('e');
  await expect
    .poll(async () => ((await inspect(page))?.player.x ?? 0) - (beforeDash?.player.x ?? 0), {
      timeout: 20_000,
    })
    .toBeGreaterThan(100);
  await expect(page.getByTestId('dash-pip')).toBeVisible();

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

  // Defeat the boss → its gold and the gate → the next realm (spec: endless-run).
  await debug(page, { type: 'damageBoss', fraction: 1 });
  await expect(page.getByTestId('hud-gate')).toContainText('The gate to');
  expect(Number(await page.getByTestId('hud-gold').textContent())).toBeGreaterThanOrEqual(250);
  await debug(page, { type: 'travel' });
  await expect(page.getByTestId('loading-kicker')).toContainText('Realm 2');
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByTestId('hud-realm')).toContainText('2 ·');

  // The run ends only at death: the summary counts the realm cleared.
  await debug(page, { type: 'godMode', enabled: false });
  await debug(page, { type: 'killPlayer' });
  await expect(page).toHaveURL(/\/summary$/, { timeout: 10_000 });
  await expect(page.getByTestId('summary-outcome')).toHaveText('You have fallen');
  await expect(page.getByTestId('summary-realms')).toHaveText('1');
  const earned = Number(await page.getByTestId('summary-gold').textContent());
  expect(earned).toBeGreaterThanOrEqual(250);
  // Glory: the first realm cleared unlocks an achievement and tops the solo table (spec: glory).
  await expect(page.getByTestId('summary-high-score')).toContainText('#1');
  await expect(page.getByTestId('summary-achievement-first_gate')).toBeVisible();

  // Back to the menu; the gold persists across a reload.
  await page.getByTestId('to-menu').click();
  await expect(page.getByTestId('menu-gold')).toHaveText(String(earned));
  await page.reload();
  await expect(page.getByTestId('menu-gold')).toHaveText(String(earned));

  // The Hall of Glory keeps the run and the achievement.
  await page.getByTestId('menu-glory').click();
  await expect(page.getByTestId('scores-table')).toContainText('Zeus');
  await expect(page.getByTestId('achievement-first_gate')).toHaveAttribute('data-unlocked', 'true');

  expect(errors).toEqual([]);
});

test('admin mode shows statistics and plays a balance report', async ({ page }) => {
  await openAsReturningPlayer(page);
  // No way in from the menu; the address asks for the password (spec: run-statistics / admin mode).
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByTestId('admin-lock')).toBeVisible();
  await expect(page.getByTestId('admin-totals')).toHaveCount(0);
  await page.getByTestId('admin-password').fill('not the password');
  await page.getByTestId('admin-unlock').click();
  await expect(page.getByTestId('admin-wrong')).toBeVisible();
  // The real password is not in the repository: stand in for a successful unlock of this tab's session.
  await page.evaluate(() => sessionStorage.setItem('olympus-unbound/admin', '1'));
  await page.reload();
  await expect(page.getByTestId('admin-empty')).toBeVisible();
  for (const god of ['hades', 'poseidon', 'athena'])
    await page.getByTestId(`balance-god-${god}`).click();
  await page.getByTestId('balance-runs').fill('1');
  await page.getByTestId('balance-minutes').fill('1');
  await page.getByTestId('balance-run').click();
  await expect(page.getByTestId('balance-row-zeus')).toContainText('Thunder Spear', {
    timeout: 30_000,
  });
  await expect(page.getByTestId('balance-run')).toBeVisible();
});

test('defeat ends the run and shows the summary', async ({ page }) => {
  await startRun(page, '12345');
  await debug(page, { type: 'killPlayer' });
  await expect(page).toHaveURL(/\/summary$/, { timeout: 10_000 });
  await expect(page.getByTestId('summary-outcome')).toHaveText('You have fallen');
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

test('a solo run with bot allies plays as a party (spec: bot-allies)', async ({ page }) => {
  await openAsReturningPlayer(page);
  await page.getByRole('link', { name: 'Play' }).click();
  await page.getByTestId('god-zeus').click();
  await page.getByTestId('add-ally').click();
  await page.getByTestId('add-ally-hades').click();
  await page.getByTestId('ally-0-hard').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('seed-input').fill('777');
  await page.getByTestId('begin').click();
  await expect(page.getByTestId('party-member')).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByTestId('hud-party')).toContainText('(bot)', { timeout: 20_000 });
  await expect.poll(async () => (await inspect(page))?.players ?? 0).toBe(2);
  // The ally moves on its own.
  const at = (await inspect(page))?.party[1];
  await expect
    .poll(
      async () => {
        const now = (await inspect(page))?.party[1];
        return Math.hypot((now?.x ?? 0) - (at?.x ?? 0), (now?.y ?? 0) - (at?.y ?? 0));
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(20);
});

test('the wandering merchant sells a companion (spec: merchant)', async ({ page }) => {
  await startRun(page, '4242');
  await debug(page, { type: 'godMode', enabled: true });
  await debug(page, { type: 'grantGold', amount: 400 });
  await debug(page, { type: 'summonMerchant' });
  await expect(page.getByTestId('hud-merchant')).toBeVisible({ timeout: 10_000 });

  // Walk into the merchant's ring.
  const at = await inspect(page);
  const merchant = at?.merchant;
  expect(merchant).toBeDefined();
  const dx = (merchant?.x ?? 0) - (at?.player.x ?? 0);
  const dy = (merchant?.y ?? 0) - (at?.player.y ?? 0);
  const keys = [
    ...(Math.abs(dx) > 30 ? [dx > 0 ? 'd' : 'a'] : []),
    ...(Math.abs(dy) > 30 ? [dy > 0 ? 's' : 'w'] : []),
  ];
  for (const k of keys) await page.keyboard.down(k);
  await expect(page.getByRole('dialog', { name: 'The Wandering Merchant' })).toBeVisible({
    timeout: 30_000,
  });
  for (const k of keys) await page.keyboard.up(k);

  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /Eagle of Zeus/ }).click();
  await expect(page.getByTestId('shop-gold')).toContainText('250');
  await page.getByRole('button', { name: /Leave/ }).click();
  await expect(page.getByRole('dialog', { name: 'The Wandering Merchant' })).toHaveCount(0);
  await expect(page.getByTestId('hud-companion-eagle_of_zeus')).toBeVisible();
});
