import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the splash homepage hero actions link to real pages', async ({
  page,
}) => {
  await page.goto('/');

  const heroActions = [
    {
      name: /Start with cash-flow timelines/i,
      heading: /Cash-flow timelines/i,
    },
    { name: /View the curriculum map/i, heading: /Curriculum map/i },
    { name: /Explore CDS legs/i, heading: /Premium.*protection legs/i },
  ];

  for (const action of heroActions) {
    const link = page.getByRole('link', { name: action.name });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    // Relative, so the deploy base path is carried; never the hard-coded prefix.
    expect(href, `${action.name} href`).not.toMatch(/^\/?equations\//);

    const response = await page.goto(new URL(href!, page.url()).toString());
    expect(response?.ok(), `${action.name} target`).toBe(true);
    await expect(page.locator('main h1')).toContainText(action.heading);
    await page.goBack();
  }
});

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
