import { expect, test } from '@playwright/test';

// Automated browsers skip the title screen unless the address asks for it (spec: run-setup / title screen).
test('the title screen waits for a click, then reveals the menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem('olympus-unbound/save', JSON.stringify({ version: 2, introSeen: true })),
  );
  await page.goto('/?gate');
  const gate = page.getByTestId('title-gate');
  await expect(gate).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('title-prompt')).toHaveText('Click or press any key');
  await gate.click();
  await expect(gate).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('on first launch the intro starts only once the title screen is entered', async ({ page }) => {
  await page.goto('/?gate');
  await expect(page).toHaveURL(/\/intro/, { timeout: 30_000 });
  const gate = page.getByTestId('title-gate');
  await expect(gate).toBeVisible();
  // Behind the title screen the intro has not begun.
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('intro-caption')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(gate).toHaveCount(0);
  await expect(page.getByTestId('intro-caption').first()).toBeVisible({ timeout: 30_000 });
});
