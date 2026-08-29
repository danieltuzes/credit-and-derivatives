import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders and operates the bond lesson', async ({ page }) => {
  await page.goto('/bonds/price-yield-relationship/');
  await expect(
    page.getByRole('heading', {
      name: 'The bond price-yield relationship',
    }),
  ).toBeVisible();

  const price = page.getByText(/Price:/).first();
  await expect(price).toContainText('95.73');
  const yieldInput = page.getByLabel('Exact yield to maturity in percent');
  await yieldInput.scrollIntoViewIfNeeded();
  await expect(
    page.locator('svg[aria-label^="Bond price by yield"]'),
  ).toBeVisible();
  await yieldInput.fill('10');
  await expect(price).not.toContainText('95.73');
});

test('has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/bonds/price-yield-relationship/');
  await expect(
    page.getByRole('heading', { name: 'Explore the bond price–yield curve' }),
  ).toBeVisible();
  await page
    .getByLabel('Exact yield to maturity in percent')
    .scrollIntoViewIfNeeded();
  await expect(
    page.locator('svg[aria-label^="Bond price by yield"]'),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
