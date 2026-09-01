import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const lessonPaths = [
  '/foundations/cash-flow-timelines/',
  '/foundations/probability-events-and-expectation/',
  '/foundations/rates-compounding-and-basis-points/',
  '/foundations/discount-factors/',
  '/foundations/present-value/',
  '/foundations/no-arbitrage-and-replication/',
  '/foundations/risk-neutral-pricing/',
  '/rates/discount-curve-and-forward-discounting/',
  '/bonds/fixed-rate-contract-and-cash-flows/',
  '/bonds/price-from-discount-factors/',
  '/bonds/yield-to-maturity/',
  '/bonds/price-yield-relationship/',
  '/bonds/settlement-clean-and-dirty-price/',
  '/bonds/bond-forwards/',
  '/derivatives/forward-contracts-and-value/',
  '/derivatives/european-option-contracts-and-payoffs/',
  '/derivatives/put-call-parity/',
  '/derivatives/one-period-binomial-option-valuation/',
  '/derivatives/multiperiod-lattice-valuation/',
  '/bond-options/european-bond-options/',
  '/bond-options/issuer-default-knockout/',
  '/credit/default-hazard-and-survival/',
  '/credit/recovery-and-risky-present-value/',
  '/cds/premium-protection-legs-and-par-spread/',
  '/cds/market-standard-quote-and-upfront/',
] as const;

for (const path of lessonPaths) {
  test(`${path} compiles cleanly and has no detectable accessibility violations`, async ({
    page,
  }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });

    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page).not.toHaveTitle('MDXError');
    await expect(page.locator('main h1')).toBeVisible();

    // Astro/MDX compiler failures return an HTTP error page. Upstream
    // rehype-katex instead recovers to a red `.katex-error` span with HTTP 200.
    // The compiler gate should prevent that output; this browser assertion is
    // an independent guard against the gate being removed or bypassed.
    const katexErrors = await page
      .locator('.katex-error')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          source: node.textContent?.trim() ?? '',
          error: node.getAttribute('title') ?? '',
        })),
      );
    expect(katexErrors, `${path} contains rendered KaTeX errors`).toEqual([]);
    expect(browserErrors, `${path} emitted browser errors`).toEqual([]);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
