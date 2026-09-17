/**
 * E2E: Map Page
 */

import { expect, test } from '@playwright/test';

test.describe('Map Page', () => {
  test('should load the map page with search panel visible', async ({ page }) => {
    await page.goto('/en/map');

    // Map container should be present (even if WebGL tiles haven't loaded)
    await expect(page.locator('[role="application"]')).toBeVisible();

    // Search panel should be visible by default
    await expect(page.locator('h2:has-text("Filters")')).toBeVisible();
  });

  test('should toggle search panel', async ({ page }) => {
    await page.goto('/en/map');

    // Close search panel
    await page.click('button[aria-label="Close search panel"]');
    await expect(page.locator('h2:has-text("Filters")')).not.toBeVisible();

    // Reopen via map control
    await page.click('button:has-text("Search")');
    await expect(page.locator('h2:has-text("Filters")')).toBeVisible();
  });

  test('should toggle legend', async ({ page }) => {
    await page.goto('/en/map');

    await page.click('button:has-text("Legend")');
    await expect(page.locator('h3:has-text("Legend")')).toBeVisible();
  });

  test('should have basemap controls', async ({ page }) => {
    await page.goto('/en/map');

    // Basemap buttons should be present
    await expect(page.locator('button[title="OpenStreetMap"]')).toBeVisible();
    await expect(page.locator('button[title="Satellite"]')).toBeVisible();
  });

  test('should show search input in filter panel', async ({ page }) => {
    await page.goto('/en/map');

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search deposits...');

    // Type in search
    await searchInput.fill('porphyry');
    await expect(searchInput).toHaveValue('porphyry');
  });
});
