import { test, expect } from '@playwright/test';

test('Diagnose: Dashboard → Attendance → Dashboard navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE_ERROR: ${msg.text()}`); });

  // 1. Load Dashboard
  await page.goto('/insights-dashboard');
  await page.waitForFunction(() => document.getElementById('root')?.children.length! > 0, { timeout: 10000 });
  await page.waitForTimeout(3000);
  const dashSidebar = await page.locator('aside').isVisible();
  console.log('Dashboard sidebar visible:', dashSidebar);

  // 2. SPA navigate → Attendance via sidebar
  await page.locator('a[href="/attendance"]').click();
  await page.waitForTimeout(3000);
  const attSidebar = await page.locator('aside').isVisible();
  const attMain = await pageimport { test, expect } from '@playwright/test';

test('Diagnose: Dashboard → Attendance → Dashboard navain visible:', attMain);

  // 3. SPA navigate → Dashboard via sidebar
  await page.locator('a[href="/insights-dashboard"]').click();
  awai  page.on('pageerror', err =>    page.on('console', msg => { if (msg.type() === 'error') errors.push(`Csh
  // 1. Load Dashboard
  await page.goto('/insights-dashboard');
  awansole.log('Dashboard return sidebar:'  await page.goto('/i:'  await page.waitForFunction(() => doc con  awaitg('COLLECTED ERRORS:', JSON.stringify(errors, null, 2));

  expect(dashSidebar).toBeTruthy();
  expect(a  cidebar).toBeTruthy();
  expect(d  c2Sidebar).toBeTruthy();
  expect(errors.filter(e => e.includ
  // 2E_ERROR'))).toHaveLength(0);
});
