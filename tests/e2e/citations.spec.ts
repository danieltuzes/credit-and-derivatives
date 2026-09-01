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
  test(`${path} renders numbered citation markers backed by a reference list`, async ({
    page,
  }) => {
    await page.goto(path);

    const markers = page.locator('.sl-markdown-content a.citation-ref');
    const items = page.locator('.sl-markdown-content ol.citations-list > li');

    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(0);
    await expect(page.locator('#references')).toBeVisible();

    // Every distinct (source, locator) marker number resolves to one list item.
    const numbers = new Set(
      await markers.evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.citationNumber ?? ''),
      ),
    );
    await expect(items).toHaveCount(numbers.size);

    for (const number of numbers) {
      const marker = page
        .locator(
          `.sl-markdown-content a.citation-ref[data-citation-number="${number}"]`,
        )
        .first();
      await expect(marker).toHaveText(`[${number}]`);
      await expect(marker).toHaveAttribute('href', `#cite-${number}`);
      await expect(page.locator(`li#cite-${number}`)).toHaveCount(1);
    }

    // First marker of each number carries the backref target.
    await expect(page.locator('#cite-ref-1')).toHaveCount(1);
  });
}

test('hovering a citation marker opens a pinnable source panel', async ({
  page,
}) => {
  await page.goto('/bonds/yield-to-maturity/');

  const marker = page
    .locator('.sl-markdown-content a.citation-ref[data-citation-number="1"]')
    .first();
  const panel = page.locator('[data-citation-panel]');

  await expect(panel).toBeHidden();
  await marker.hover();
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-panel-label]')).toContainText('Tuckman');
  await expect(panel.locator('[data-panel-locator]')).toContainText('3.2');

  // Pin keeps it open after the pointer leaves; Escape closes it.
  await panel.locator('[data-panel-pin]').click({ force: true });
  await page.mouse.move(2, 2);
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('citation markers still work as plain links without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/foundations/present-value/');

  const marker = page.locator('.sl-markdown-content a.citation-ref').first();
  await expect(marker).toHaveAttribute('href', /#cite-\d+/);
  await marker.click();
  await expect(page).toHaveURL(/#cite-1$/);
  await expect(page.locator('li#cite-1')).toBeVisible();

  await context.close();
});
