/**
 * E2E: Internationalization
 */

import { expect, test } from '@playwright/test';

test.describe('Internationalization', () => {
  test('header should show correct language toggle', async ({ page }) => {
    await page.goto('/en/map');
    await expect(page.locator('button:has-text("中文")')).toBeVisible();

    await page.click('button:has-text("中文")');
    await expect(page).toHaveURL(/\/zh\/map/);
    await expect(page.locator('button:has-text("EN")')).toBeVisible();
  });

  test('statistics page should localize', async ({ page }) => {
    await page.goto('/en/statistics');
    await expect(page.locator('h1')).toContainText('Statistics');

    await page.click('button:has-text("中文")');
    await expect(page).toHaveURL(/\/zh\/statistics/);
    await expect(page.locator('h1')).toContainText('统计');
  });

  test('map filter labels should localize', async ({ page }) => {
    await page.goto('/en/map');
    await expect(page.locator('text=Country')).toBeVisible();
    await expect(page.locator('text=Deposit Type')).toBeVisible();

    await page.click('button:has-text("中文")');
    await page.goto('/zh/map');
    await expect(page.locator('text=国家')).toBeVisible();
    await expect(page.locator('text=矿床类型')).toBeVisible();
  });
});
