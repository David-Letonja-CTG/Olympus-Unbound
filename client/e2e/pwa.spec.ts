import { expect, test } from '@playwright/test';

/**
 * The installed game (spec: installable-app), from a production build (the service worker is off in development).
 * The server can drop every connection (`/__test/network`), so the page and its service worker are truly offline.
 */
const network = (baseURL: string | undefined, down: boolean) =>
  fetch(`${baseURL}/__test/network?down=${down ? 1 : 0}`, { method: 'POST' });

test.afterEach(async ({ baseURL }) => {
  await network(baseURL, false);
});

test('installable, and once loaded a solo run plays offline', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => {
    if (localStorage.getItem('olympus-unbound/save')) return;
    const save = { version: 2, introSeen: true, settings: { quality: 'low' } };
    localStorage.setItem('olympus-unbound/save', JSON.stringify(save));
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();

  // The manifest: name, icons, full screen, relative start page.
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifest = await (await page.request.get(`${baseURL}/${href}`)).json();
  expect(manifest).toMatchObject({
    name: 'Olympus Unbound',
    display: 'fullscreen',
    start_url: './',
    scope: './',
  });
  const icons = manifest.icons as { src: string; sizes: string; purpose: string }[];
  expect(icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(
    expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
  );
  for (const icon of icons)
    expect((await page.request.get(`${baseURL}/${icon.src}`)).ok()).toBe(true);

  // The service worker registers once the menu is idle and keeps every file of the build.
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.active,
    null,
    { timeout: 90_000, polling: 1000 },
  );
  const files = await page.evaluate(
    async () => (await (await fetch('ngsw.json')).json()).hashTable,
  );
  const expected = Object.keys(files).length;
  await page.waitForFunction(
    async (n) => {
      let cached = 0;
      for (const key of await caches.keys())
        cached += (await (await caches.open(key)).keys()).length;
      return cached >= n;
    },
    expected,
    { timeout: 120_000, polling: 1000 },
  );

  // Offline: the server is gone, and the browser says so.
  await network(baseURL, true);
  await context.setOffline(true);

  // Rooms need a connection.
  await page.goto('/coop');
  await expect(page.getByTestId('offline')).toBeVisible();
  await expect(page.getByTestId('create-room')).toBeDisabled();

  // A deep link and a whole solo run, from the cache.
  await page.goto('/gods');
  await page.getByTestId('god-zeus').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('begin').click();
  await expect(page.locator('[data-testid=game-host] canvas')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('run-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByTestId('hud-time')).not.toHaveText('00:00', { timeout: 30_000 });
});
