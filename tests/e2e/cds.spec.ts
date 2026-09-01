import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const lessonPath = '/cds/premium-protection-legs-and-par-spread/';

test('CDS explorer reproduces its default case and key boundaries', async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto(lessonPath);
  const lab = page.getByRole('region', {
    name: 'Explore the CDS premium and protection legs',
  });
  await expect(lab).toBeVisible();

  const hazard = lab.getByLabel(
    'Exact constant risk-neutral hazard rate in percent per model-year',
  );
  await hazard.scrollIntoViewIfNeeded();
  await expect(hazard).toBeEnabled({ timeout: 15_000 });
  await expect(lab.locator('[data-cds-output="scheduled-premium"]')).toHaveText(
    '$508,106',
  );
  await expect(lab.locator('[data-cds-output="accrued-premium"]')).toHaveText(
    '$1,596',
  );
  await expect(lab.locator('[data-cds-output="premium-leg"]')).toHaveText(
    '$509,703',
  );
  await expect(lab.locator('[data-cds-output="protection-leg"]')).toHaveText(
    '$640,321',
  );
  await expect(lab.locator('[data-cds-output="buyer-net"]')).toHaveText(
    '$130,619',
  );
  await expect(lab.locator('[data-cds-output="par-spread"]')).toHaveText(
    '150.8 bp/year',
  );
  await expect(
    lab.locator('svg[aria-label^="CDS premium-leg and protection-leg"]'),
  ).toBeVisible();

  await lab
    .getByLabel('Exact contractual spread in basis points per year')
    .fill('150.75');
  await expect(lab.locator('[data-cds-output="interpretation"]')).toContainText(
    'approximately balanced',
  );

  await hazard.fill('5');
  await expect(lab.locator('[data-cds-output="par-spread"]')).toHaveText(
    '301.5 bp/year',
  );

  const recovery = lab.getByLabel('Exact recovery rate in percent of notional');
  await recovery.fill('100');
  await expect(lab.locator('[data-cds-output="protection-leg"]')).toHaveText(
    '$0',
  );
  await expect(lab.locator('[data-cds-output="par-spread"]')).toHaveText(
    '0.0 bp/year',
  );

  await recovery.fill('40');
  await hazard.fill('0');
  await expect(lab.locator('[data-cds-output="accrued-premium"]')).toHaveText(
    '$0',
  );
  await expect(lab.locator('[data-cds-output="protection-leg"]')).toHaveText(
    '$0',
  );
  await expect(lab.locator('[data-cds-output="par-spread"]')).toHaveText(
    '0.0 bp/year',
  );
  expect(browserErrors).toEqual([]);
});

test('CDS explorer remains useful without JavaScript', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();

  try {
    await page.goto(lessonPath);
    const lab = page.getByRole('region', {
      name: 'Explore the CDS premium and protection legs',
    });
    await expect(lab).toContainText(
      'Interactive controls and the chart require JavaScript',
    );
    await expect(
      lab.getByLabel('Exact contractual spread in basis points per year'),
    ).toBeDisabled();
    await expect(lab.locator('[data-cds-output="par-spread"]')).toHaveText(
      '150.8 bp/year',
    );
    await expect(
      lab.getByRole('table', {
        name: /Current exact-time quarterly schedule, survival values/,
      }),
    ).toBeVisible();
    await expect(lab.locator('.cds-leg-chart svg')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('CDS explorer is accessible and contained on a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lessonPath);

  const lab = page.getByRole('region', {
    name: 'Explore the CDS premium and protection legs',
  });
  const exactSpread = lab.getByLabel(
    'Exact contractual spread in basis points per year',
  );
  await exactSpread.scrollIntoViewIfNeeded();
  await expect(exactSpread).toBeEnabled({ timeout: 15_000 });
  await expect(lab.locator('.lab-table-scroll')).toBeVisible();

  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(overflow.content).toBeLessThanOrEqual(overflow.viewport + 1);

  const results = await new AxeBuilder({ page })
    .include('.lab-shell')
    .analyze();
  expect(results.violations).toEqual([]);
});

test('sidebar and footer navigation connect bonds, credit risk, and CDS', async ({
  page,
}) => {
  await page.goto('/bonds/price-yield-relationship/');
  await expect(page.getByText('Credit risk', { exact: true })).toBeVisible();
  await expect(page.getByText('CDS', { exact: true })).toBeVisible();
  await expect(page.locator('footer a[rel="next"]')).toHaveAttribute(
    'href',
    '/credit/default-hazard-and-survival/',
  );

  await page.goto('/credit/recovery-and-risky-present-value/');
  await expect(page.locator('footer a[rel="next"]')).toHaveAttribute(
    'href',
    lessonPath,
  );

  await page.goto(lessonPath);
  await expect(page.locator('footer a[rel="next"]')).toHaveAttribute(
    'href',
    '/cds/market-standard-quote-and-upfront/',
  );

  await page.goto('/cds/market-standard-quote-and-upfront/');
  await expect(page.locator('footer a[rel="prev"]')).toHaveAttribute(
    'href',
    lessonPath,
  );
});

test('legacy equation URL redirects to the curriculum-backed CDS lesson', async ({
  page,
}) => {
  await page.goto('/test_equation/');
  await expect(page).toHaveURL(new RegExp(`${lessonPath}$`));
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'CDS premium and protection legs',
    }),
  ).toBeVisible();
});
