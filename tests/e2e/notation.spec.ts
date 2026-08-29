import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const lessonPath = '/foundations/discount-factors/';

test('renders semantic notation as static KaTeX with one flat control per key', async ({
  page,
}) => {
  await page.goto(lessonPath);
  await expect(
    page.getByRole('heading', { name: 'Discount factors', exact: true }),
  ).toBeVisible();

  const layer = page.locator('[data-notation-layer]');
  await expect(layer).toBeVisible();
  await expect(
    layer.getByText('Notation used on this page', { exact: false }),
  ).toBeVisible();

  const mathMarker = page
    .locator('.katex-html [data-notation-key="discount-factor"]')
    .first();
  await expect(mathMarker).toBeVisible();
  await expect(page.locator('.katex-mathml [data-notation-key]')).toHaveCount(
    0,
  );

  const proseMarker = page
    .locator('a.notation-term[data-notation-key="accumulation-factor"]')
    .first();
  await expect(proseMarker).toBeVisible();
  await expect(proseMarker).toHaveAttribute(
    'href',
    '/glossary/#notation-accumulation-factor',
  );

  await expect(
    layer.locator('[data-notation-entry="discount-factor"]'),
  ).toHaveCount(1);
  await expect(
    layer.locator('[data-notation-control="discount-factor"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-notation-key="discount-factor"] button'),
  ).toHaveCount(0);
});

test('opens, pins, links, and closes a notation explanation by keyboard', async ({
  page,
}) => {
  await page.goto(lessonPath);
  const layer = page.locator('[data-notation-layer]');
  await layer.locator('details > summary').click();

  const control = layer.locator('[data-notation-control="discount-factor"]');
  const panel = layer.locator('[data-notation-panel]');
  await expect(control).toBeVisible();
  await control.focus();
  await page.keyboard.press('Enter');

  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(control).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute(
    'data-active-notation-key',
    'discount-factor',
  );
  await expect(panel.locator('[data-panel-title]')).toHaveText(
    'Discount factor',
  );
  await expect(panel.locator('[data-panel-link]')).toHaveAttribute(
    'href',
    '/glossary/#notation-discount-factor',
  );

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(control).toHaveAttribute('aria-pressed', 'false');
  await expect(control).toHaveAttribute('aria-expanded', 'false');
});

test('resolves a shared definition to its generated glossary entry', async ({
  page,
}) => {
  await page.goto('/glossary/#notation-discount-factor');
  await expect(
    page.getByRole('heading', { name: 'Notation glossary', exact: true }),
  ).toBeVisible();

  const entry = page.locator('article#notation-discount-factor');
  await expect(entry).toBeVisible();
  await expect(
    entry.getByRole('heading', { name: 'Discount factor', exact: true }),
  ).toBeVisible();
  await expect(
    entry.getByText('rates.discount-factor.interpret'),
  ).toBeVisible();
  await expect(
    entry.getByRole('link', { name: 'Discount factors', exact: true }),
  ).toHaveAttribute('href', '/foundations/discount-factors/');
});

test('renders transitive registry dependencies in the page disclosure', async ({
  page,
}) => {
  await page.goto('/bonds/price-yield-relationship/');
  const layer = page.locator('[data-notation-layer]');
  await layer.locator('details > summary').click();

  // This definition is reached through the authored definition graph; the
  // lesson does not list it as a direct notation.uses import.
  await expect(
    layer.locator('[data-notation-entry="annual-coupon-rate"]'),
  ).toBeVisible();
  await expect(
    layer.locator('[data-notation-entry="price-yield-curve"]'),
  ).toBeVisible();
});

test('keeps page notation and definitions available without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(lessonPath);

  const layer = page.locator('[data-notation-layer]');
  const details = layer.locator('details');
  await expect(layer).toBeVisible();
  await expect(details.locator('summary')).toBeVisible();
  await details.locator('summary').click();
  await expect(
    details.locator('[data-notation-entry="discount-factor"]'),
  ).toBeVisible();
  await expect(
    details.locator('[data-notation-link="discount-factor"]'),
  ).toHaveAttribute('href', '/glossary/#notation-discount-factor');
  await expect(
    details.locator('[data-notation-control="discount-factor"]'),
  ).toBeHidden();
  await expect(
    page.locator('.katex-html [data-notation-key="discount-factor"]').first(),
  ).toBeVisible();

  await context.close();
});

test('has no detectable accessibility violations with an explanation pinned', async ({
  page,
}) => {
  await page.goto(lessonPath);
  const layer = page.locator('[data-notation-layer]');
  await layer.locator('details > summary').click();
  await layer.locator('[data-notation-control="discount-factor"]').click();
  await expect(layer.locator('[data-notation-panel]')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[data-notation-layer]')
    .analyze();
  expect(results.violations).toEqual([]);
});
