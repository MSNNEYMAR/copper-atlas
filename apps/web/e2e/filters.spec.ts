/**
 * E2E: Search and Filter Interactions
 */

import { expect, test } from '@playwright/test';

test.describe('Search and Filters', () => {
  test('should allow typing in search field', async ({ page }) => {
    await page.goto('/en/map');

    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Chuquicamata');
    await expect(searchInput).toHaveValue('Chuquicamata');

    // Active filter chip should appear
    await expect(page.locator('text="Chuquicamata"')).toBeVisible();
  });

  test('should show status filter buttons', async ({ page }) => {
    await page.goto('/en/map');

    await expect(page.locator('button:has-text("Production")')).toBeVisible();
    await expect(page.locator('button:has-text("Development")')).toBeVisible();
    await expect(page.locator('button:has-text("Exploration")')).toBeVisible();
  });

  test('should toggle status filter', async ({ page }) => {
    await page.goto('/en/map');

    await page.click('button:has-text("Production")');

    // Active filter chip should show
    await expect(page.locator('text=production')).toBeVisible();

    // Click again to remove
    await page.click('button:has-text("Production")');
  });

  test('should show tonnage range inputs', async ({ page }) => {
    await page.goto('/en/map');

    const numberInputs = page.locator('input[type="number"]');
    await expect(numberInputs.first()).toBeVisible();
  });

  test('should have clear all filters button when filters active', async ({ page }) => {
    await page.goto('/en/map');

    // Activate a filter
    await page.click('button:has-text("Production")');

    // Clear all should appear
    await expect(page.locator('text=Clear all filters')).toBeVisible();

    // Click to clear
    await page.click('text=Clear all filters');
  });
});
