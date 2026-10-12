import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the splash homepage hero actions link to real pages', async ({
  page,
}) => {
  await page.goto('/');

  const heroActions = [
    { name: /Start with the foundations/i, heading: /^Foundations$/ },
    { name: /View the curriculum map/i, heading: /Curriculum map/i },
  ];

  // Two actions stay on the page: they jump to a section of the homepage.
  for (const [name, anchor] of [
    [/Choose a starting point/i, '#where-to-start'],
    [/Browse the course contents/i, '#course-contents'],
  ] as const) {
    await expect(page.getByRole('link', { name })).toHaveAttribute(
      'href',
      anchor,
    );
    await expect(page.locator(anchor)).toHaveCount(1);
  }

  for (const action of heroActions) {
    const link = page.getByRole('link', { name: action.name });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    // Relative, so the deploy base path is carried; never the hard-coded prefix.
    expect(href, `${action.name} href`).not.toMatch(/^\/?equations\//);

    const response = await page.goto(new URL(href!, page.url()).toString());
    expect(response?.ok(), `${action.name} target`).toBe(true);
    await expect(page.locator('main h1')).toHaveText(action.heading);
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
  // The live chart, which replaces the build's copy (labs.spec.ts).
  await expect(
    page.locator('.lab-chart-live svg[aria-label^="Bond price by yield"]'),
  ).toBeVisible();
  // The plot and the controls are two islands of one figure (rule V3): type
  // only once the controls have hydrated too.
  await expect(
    page.locator(
      '#fig-bond-price-yield-explorer .keyed-figure__tools astro-island',
    ),
  ).not.toHaveAttribute('ssr', /.*/);
  await yieldInput.fill('10');
  await expect(price).not.toContainText('95.73');
});

test('has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/bonds/price-yield-relationship/');
  // The explorer is a numbered figure, named by its caption (rule V3).
  await expect(
    page.getByRole('figure', { name: /Bond price–yield explorer/ }),
  ).toBeVisible();
  await page
    .getByLabel('Exact yield to maturity in percent')
    .scrollIntoViewIfNeeded();
  await expect(
    page.locator('.lab-chart-live svg[aria-label^="Bond price by yield"]'),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
