import { test, expect, Page } from '@playwright/test';

const waitForApp = async (page: Page) => {
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  }, { timeout: 15000 });
};

const getIsoDateDaysFromNow = (daysFromNow: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

test.describe('Labor Contracts lifecycle validation', () => {
  test('saving a 10-day contract shows amber Expiring Soon and KPI increments', async ({ page }) => {
    await page.goto('/labor-contracts');
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: 'Labor Contracts (EC)' })).toBeVisible();

    const expiringSoonCard = page.locator('div.bg-white').filter({ hasText: 'Expiring Soon' }).first();
    const expiringSoonStat = expiringSoonCard.locator('p.text-2xl');

    const initialExpiringSoon = Number((await expiringSoonStat.first().textContent()) || '0');

    await page.getByRole('button', { name: 'New Contract' }).click();
    await expect(page.getByText('New Labor Contract')).toBeVisible();

    // Fill required and new fields
    await page.locator('select').first().selectOption('EMP-004');
    await page.locator('select').nth(1).selectOption('Casual');
    await page.locator('input[type="date"]').nth(0).fill(getIsoDateDaysFromNow(0)); // signed date
    await page.locator('input[type="date"]').nth(1).fill(getIsoDateDaysFromNow(0)); // start date
    await page.locator('input[type="date"]').nth(2).fill(getIsoDateDaysFromNow(10)); // end date
    await page.locator('input[type="number"]').fill('990000');
    await page.locator('input[type="url"]').fill('https://example.com/contracts/e2e-expiring-soon.pdf');

    await page.getByRole('button', { name: 'Save Contract' }).click();
    await expect(page.getByText('New Labor Contract')).toHaveCount(0);

    // New row should show Expiring Soon with amber styling
    const row = page.locator('tr').filter({ hasText: 'EMP-004' }).first();
    await expect(row.getByText('Expiring Soon')).toBeVisible();
    await expect(row.getByText('Expiring Soon')).toHaveClass(/amber/);

    // KPI increment
    const finalExpiringSoon = Number((await expiringSoonStat.first().textContent()) || '0');
    expect(finalExpiringSoon).toBe(initialExpiringSoon + 1);
  });

  test('expired contract sets Contract Action Required in Employee Directory', async ({ page }) => {
    await page.goto('/labor-contracts');
    await waitForApp(page);
    await page.getByRole('button', { name: 'New Contract' }).click();

    await page.locator('select').first().selectOption('EMP-012');
    await page.locator('select').nth(1).selectOption('Fixed Term');
    await page.locator('input[type="date"]').nth(0).fill(getIsoDateDaysFromNow(-30)); // signed date
    await page.locator('input[type="date"]').nth(1).fill(getIsoDateDaysFromNow(-20)); // start date
    await page.locator('input[type="date"]').nth(2).fill(getIsoDateDaysFromNow(-1)); // end date
    await page.locator('input[type="number"]').fill('980000');
    await page.getByRole('button', { name: 'Save Contract' }).click();
    await expect(page.getByText('New Labor Contract')).toHaveCount(0);
    await expect(page.locator('tr').filter({ hasText: 'EMP-012' }).first().getByText('Expired')).toBeVisible();

    // Use SPA navigation to preserve in-memory context state from the save action.
    await page.locator('a[href="/employees"]').first().click();
    await expect(page).toHaveURL(/\/employees$/);
    await waitForApp(page);
    await page.locator('input[type="text"]').first().fill('EMP-012');

    const employeeRow = page.locator('tr').filter({ hasText: 'EMP-012' }).first();
    await expect(employeeRow).toBeVisible();
    await expect(employeeRow.getByText('Contract Action Required')).toBeVisible();
  });
});
