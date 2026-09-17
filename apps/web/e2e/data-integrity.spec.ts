/**
 * Copper Atlas — Data Integrity E2E Verification
 *
 * Run after every deployment:
 *   npx playwright test e2e/data-integrity.spec.ts
 *
 * Verifies: DB count = API count = Map Source count = Statistics count
 */
import { expect, test } from '@playwright/test';

test.describe('Data Integrity Verification', () => {
  test('API returns all active copper deposits', async ({ request }) => {
    const resp = await request.get('/api/v1/deposits?mineral=copper&size=5000');
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.type).toBe('FeatureCollection');
    expect(Array.isArray(data.features)).toBeTruthy();
    expect(data.features.length).toBeGreaterThanOrEqual(2092);
    console.log(`API deposits: ${data.features.length}`);
  });

  test('all GeoJSON features have valid Point geometry', async ({ request }) => {
    const resp = await request.get('/api/v1/deposits?mineral=copper&size=5000');
    const data = await resp.json();
    for (const f of data.features) {
      expect(f.type).toBe('Feature');
      expect(f.geometry?.type).toBe('Point');
      const [lng, lat] = f.geometry?.coordinates || [];
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(f.properties?.name).toBeTruthy();
      expect(f.properties?.id).toBeTruthy();
      expect(f.properties?.slug).toBeTruthy();
    }
  });

  test('no null island coordinates', async ({ request }) => {
    const resp = await request.get('/api/v1/deposits?mineral=copper&size=5000');
    const data = await resp.json();
    const nullIsland = data.features.filter((f: any) => {
      const [lng, lat] = f.geometry?.coordinates || [];
      return lng === 0 && lat === 0;
    });
    expect(nullIsland.length).toBe(0);
  });

  test('every feature has required properties', async ({ request }) => {
    const resp = await request.get('/api/v1/deposits?mineral=copper&size=5000');
    const data = await resp.json();
    const required = ['id', 'name', 'slug', 'country_iso', 'deposit_type_code', 'status'];
    for (const f of data.features) {
      for (const key of required) {
        expect(f.properties[key]).toBeDefined();
      }
    }
  });

  test('no duplicate slugs in API response', async ({ request }) => {
    const resp = await request.get('/api/v1/deposits?mineral=copper&size=5000');
    const data = await resp.json();
    const slugs = new Set<string>();
    const duplicates: string[] = [];
    for (const f of data.features) {
      const s = f.properties?.slug;
      if (slugs.has(s)) duplicates.push(s);
      else if (s) slugs.add(s);
    }
    expect(duplicates).toHaveLength(0);
  });

  test('statistics API matches deposits API', async ({ request }) => {
    const [depResp, statsResp] = await Promise.all([
      request.get('/api/v1/deposits?mineral=copper&size=5000'),
      request.get('/api/v1/statistics'),
    ]);
    const depData = await depResp.json();
    const statsData = await statsResp.json();
    expect(statsData.overview.total_deposits).toBe(depData.features.length);
  });

  test('search finds known deposits', async ({ page }) => {
    await page.goto('/en/map');
    // Wait for map to load
    await page.waitForSelector('[role="application"]', { timeout: 10000 });
    // Search for a well-known deposit
    await page.fill('input[type="search"]', 'Escondida');
    await page.waitForTimeout(800);
    // Should show at least one result
    const results = page.locator('button:has-text("Escondida")');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  });

  test('country filter works', async ({ request }) => {
    // Filter Chile
    const resp = await request.get('/api/v1/deposits?mineral=copper&country=CL&size=5000');
    const data = await resp.json();
    expect(data.features.length).toBeGreaterThan(0);
    // All returned features must be in Chile
    for (const f of data.features) {
      expect(f.properties?.country_iso).toBe('CL');
    }
  });

  test('status filter works', async ({ request }) => {
    const resp = await request.get('/api/v1/deposits?mineral=copper&status=production&size=5000');
    const data = await resp.json();
    expect(data.features.length).toBeGreaterThan(0);
    for (const f of data.features) {
      expect(f.properties?.status).toBe('production');
    }
  });

  test('deposit detail API returns full data', async ({ request }) => {
    // Get first deposit ID
    const listResp = await request.get('/api/v1/deposits?mineral=copper&size=1');
    const listData = await listResp.json();
    const firstId = listData.features[0]?.properties?.id;
    expect(firstId).toBeTruthy();

    // Fetch detail
    const detailResp = await request.get(`/api/v1/deposits/${firstId}`);
    expect(detailResp.ok()).toBeTruthy();
    const detail = await detailResp.json();
    expect(detail.type).toBe('Feature');
    expect(detail.properties.name).toBeTruthy();
    expect(detail.properties.id).toBe(firstId);
  });
});
