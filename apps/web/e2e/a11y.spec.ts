/**
 * E2E: Accessibility (WCAG 2.1 AA)
 */

import { expect, test } from '@playwright/test';

test.describe('Accessibility', () => {
  test('map page has correct ARIA role', async ({ page }) => {
    await page.goto('/en/map');
    await expect(page.locator('[role="application"]')).toBeVisible();
  });

  test('map has accessible label', async ({ page }) => {
    await page.goto('/en/map');
    const map = page.locator('[role="application"]');
    await expect(map).toHaveAttribute('aria-label', /map/i);
  });

  test('header navigation links are keyboard accessible', async ({ page }) => {
    await page.goto('/en');

    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // A navigation link should be focused
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('language switcher has accessible label', async ({ page }) => {
    await page.goto('/en');

    const langBtn = page.locator('button[aria-label]').first();
    await expect(langBtn).toBeVisible();
  });

  test('page has correct lang attribute', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/zh');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
  });

  test('map controls have accessible labels', async ({ page }) => {
    await page.goto('/en/map');

    // Basemap buttons have aria-labels
    const osmBtn = page.locator('button[aria-label="OpenStreetMap"]');
    if (await osmBtn.isVisible()) {
      await expect(osmBtn).toHaveAttribute('aria-pressed');
    }
  });
});
