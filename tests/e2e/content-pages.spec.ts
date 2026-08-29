import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const lessonPaths = [
  '/foundations/cash-flow-timelines/',
  '/foundations/rates-compounding-and-basis-points/',
  '/foundations/discount-factors/',
  '/foundations/present-value/',
  '/bonds/fixed-rate-contract-and-cash-flows/',
  '/bonds/price-from-discount-factors/',
  '/bonds/yield-to-maturity/',
  '/bonds/price-yield-relationship/',
] as const;

for (const path of lessonPaths) {
  test(`${path} renders without detectable accessibility violations`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator('main h1')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
