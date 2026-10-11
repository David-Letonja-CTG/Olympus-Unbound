import { expect, test } from '@playwright/test';
import { openAsReturningPlayer } from './run';

test('the intro plays on first launch, can be skipped, and does not play again', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page).toHaveURL(/\/intro$/);
  // Software rendering (CI) loads slowly: wait for the first caption.
  await expect(page.getByTestId('intro-caption').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('intro-skip')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
  await expect(page).not.toHaveURL(/intro/);
  expect(errors).toEqual([]);
});

test('the intro can be replayed from the main menu', async ({ page }) => {
  await openAsReturningPlayer(page);
  await page.getByTestId('menu-intro').click();
  await expect(page).toHaveURL(/\/intro$/);
  await expect(page.getByTestId('intro-skip')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('intro-skip').click();
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
});
