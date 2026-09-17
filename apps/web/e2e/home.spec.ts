/**
 * E2E: Home Page
 */

import { expect, test } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the title and navigation links', async ({ page }) => {
    await page.goto('/en');

    // Title should be visible
    await expect(page.locator('h1')).toContainText('Global Copper Deposits Atlas');

    // Navigation links should be present
    await expect(page.locator('text=Explore Map')).toBeVisible();
    await expect(page.locator('text=View Statistics')).toBeVisible();
  });

  test('should switch language from EN to ZH', async ({ page }) => {
    await page.goto('/en');
    await page.click('button:has-text("中文")');
    await expect(page).toHaveURL(/\/zh/);
    await expect(page.locator('h1')).toContainText('全球铜矿床图谱');
  });

  test('should navigate to map page', async ({ page }) => {
    await page.goto('/en');
    await page.click('text=Explore Map');
    await expect(page).toHaveURL(/\/en\/map/);
  });

  test('should navigate to statistics page', async ({ page }) => {
    await page.goto('/en');
    await page.click('text=View Statistics');
    await expect(page).toHaveURL(/\/en\/statistics/);
  });
});
