import { expect, Page, test } from '@playwright/test';
import { debug, inspect } from './run';

/**
 * Two players in one room (spec: rooms), as two tabs of one browser, connected through the game server that
 * Playwright starts (D21, playwright.config.ts).
 */
async function openCoop(page: Page, name: string, path = '/coop?debug'): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem('olympus-unbound/save')) return;
    const save = { version: 2, introSeen: true, settings: { quality: 'low' } };
    localStorage.setItem('olympus-unbound/save', JSON.stringify(save));
  });
  await page.goto(path);
  await page.getByTestId('player-name').fill(name);
}

test('two players create and join a room, play together, and one leaves', async ({ context }) => {
  test.setTimeout(300_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors: string[] = [];
  const host = await context.newPage();
  const guest = await context.newPage();
  for (const p of [host, guest]) p.on('pageerror', (e) => errors.push(e.message));

  // Lobby: create, invite (spec: rooms / joining a room), join from the link, pick a god, get ready, start.
  await openCoop(host, 'Ada');
  await host.getByTestId('create-room').click();
  const code = (await host.getByTestId('room-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z2-9]{5}$/);

  // Desktop Chromium has no share sheet: Invite copies the link.
  await host.getByTestId('invite').click();
  await expect(host.getByTestId('invite')).toContainText('Link copied');
  const copied = await host.evaluate(() => navigator.clipboard.readText());
  const invite = new URL(copied.match(/https?:\/\/\S+/)?.[0] ?? '');
  expect(invite.searchParams.get('join')).toBe(code);

  await openCoop(guest, 'Bo', invite.pathname + invite.search);
  await expect(guest.getByTestId('invited')).toContainText(code);
  await expect(guest.getByTestId('room-code-input')).toHaveValue(code);
  await guest.getByTestId('join-room').click();
  await expect(host.getByTestId('member-1')).toContainText('Bo');
  await expect(guest.getByTestId('member-0')).toContainText('Ada');
  await guest.getByTestId('lobby-god-hades').click();
  await expect(host.getByTestId('member-1')).toContainText('Hades');
  await expect(host.getByTestId('start-room')).toBeDisabled();
  await guest.getByTestId('ready').click();
  await expect(host.getByTestId('start-room')).toBeEnabled();
  await host.getByTestId('start-room').click();

  // Both load the same run, with the room's party and code on the loading screen.
  for (const p of [host, guest]) {
    await expect(p.getByTestId('loading-room-code')).toContainText(code);
    await expect(p.getByTestId('party-member')).toHaveCount(2);
  }
  for (const p of [host, guest])
    await expect(p.getByTestId('run-loading')).toHaveCount(0, { timeout: 150_000 });
  await expect
    .poll(async () => (await inspect(host))?.time ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(0.5);
  await debug(host, { type: 'godMode', enabled: true });

  // The guest moves; the host's game moves the guest's god.
  const before = (await inspect(host))?.party[1].x ?? 0;
  await guest.keyboard.down('d');
  await expect
    .poll(async () => ((await inspect(host))?.party[1].x ?? 0) - before, { timeout: 20_000 })
    .toBeGreaterThan(40);
  await guest.keyboard.up('d');

  // Level-up: each sees their own choice; the host waits for the guest.
  await debug(host, { type: 'grantXp', amount: 5 });
  await expect(host.getByRole('dialog', { name: 'Level 2!' })).toBeVisible();
  await expect(guest.getByRole('dialog', { name: 'Level 2!' })).toBeVisible();
  await host.waitForTimeout(350);
  await host.keyboard.press('1');
  await expect(host.getByTestId('waiting-for')).toContainText('Bo');
  await guest.waitForTimeout(350);
  await guest.keyboard.press('1');
  await expect.poll(async () => (await inspect(host))?.phase, { timeout: 15_000 }).toBe('playing');
  await expect(host.getByTestId('waiting-for')).toHaveCount(0);

  // The guest falls; the host stands by the spirit and revives them (spec: co-op / reviving allies).
  await debug(host, { type: 'killPlayer', slot: 1 });
  await expect.poll(async () => (await inspect(host))?.party[1].alive).toBe(false);
  // Short steps toward the spirit, so the host stops beside it rather than running past.
  for (let i = 0; i < 60; i++) {
    const p = (await inspect(host))?.party ?? [];
    const dx = (p[1]?.x ?? 0) - (p[0]?.x ?? 0);
    if (Math.abs(dx) < 40) break;
    const key = dx < 0 ? 'a' : 'd';
    await host.keyboard.down(key);
    await host.waitForTimeout(80);
    await host.keyboard.up(key);
  }
  await expect
    .poll(async () => (await inspect(host))?.party[1].alive, { timeout: 15_000 })
    .toBe(true);

  // Through the gate together: both load the next realm, and the run goes on there (spec: endless-run).
  await debug(host, { type: 'travel' });
  // The host's loading screen waits for the guest; the guest's may already have faded when checked.
  await expect(host.getByTestId('loading-kicker')).toContainText('Realm 2');
  for (const p of [host, guest])
    await expect(p.getByTestId('run-loading')).toHaveCount(0, { timeout: 150_000 });
  await expect.poll(async () => (await inspect(guest))?.depth).toBe(1);
  await expect.poll(async () => (await inspect(host))?.depth).toBe(1);
  await expect(guest.getByTestId('hud-realm')).toContainText('2 ·');

  // The pause menu does not stop a room's run. (The clock may still stop for a new round of choices: kills keep
  // bringing experience, so this checks the run's phase, not its time.)
  await host.keyboard.press('Escape');
  await expect(host.getByTestId('room-runs-on')).toBeVisible();
  await host.waitForTimeout(500);
  expect((await inspect(host))?.phase).not.toBe('paused');
  await host.getByTestId('resume').click();

  // The guest leaves: their run ends as abandoned; the host's goes on without them.
  await guest.keyboard.press('Escape');
  await guest.getByTestId('abandon').click();
  await guest.getByTestId('abandon-confirm').click();
  await expect(guest).toHaveURL(/\/summary$/, { timeout: 15_000 });
  await expect(guest.getByRole('heading', { level: 1 })).toContainText(/abandoned/i);
  await expect(guest.getByTestId('to-coop')).toBeVisible();
  await expect.poll(async () => (await inspect(host))?.players, { timeout: 15_000 }).toBe(1);
  expect((await inspect(host))?.phase).not.toBe('ended');

  expect(errors).toEqual([]);
});
