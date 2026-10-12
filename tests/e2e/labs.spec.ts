import { expect, test, type Page } from '@playwright/test';
import { unboundFigureSymbols } from 'explico/reference/figure-symbols';

// Each explorer is a numbered figure (rule V3). Its plot is the figure's
// picture and writes the case it shows at the end of the caption, which the
// PDF and Markdown downloads print; its controls are the figure's tools,
// after the caption. The plot and the tools are two islands that share the
// explorer's inputs (`content/labs/lab-state.ts`). The expected values are
// the lessons' and the CDS spec's: USD 907.03 for USD 1,000 in two years at
// 5%, 95.73 and 91.68 for the 5% bond at 6% and 7%, and the CDS legs.

const explorers = [
  {
    path: '/foundations/present-value/',
    figure: 'fig-discounting-explorer',
    shown:
      'Shown for a future payment of USD 1,000 in 2 years at an annual rate of 5%: value today USD 907.03.',
  },
  {
    path: '/bonds/price-yield-relationship/',
    figure: 'fig-bond-price-yield-explorer',
    shown:
      'Shown for a 5% annual coupon rate, 2 coupon payments a year and a 5-year maturity: at a 6% yield to maturity, the price is 95.73 per 100 face value.',
  },
  {
    path: '/cds/premium-protection-legs-and-par-spread/',
    figure: 'fig-cds-leg-explorer',
    shown:
      'Shown for a contractual spread of 120.0 bp/year, a constant risk-neutral hazard rate of 2.5%/year, a recovery rate of 40%, a continuously compounded risk-free rate of 4% and a maturity of 5 years: premium leg USD 509,703, protection leg USD 640,321.',
  },
] as const;

/** The caption's live clause as a reader sees it, whitespace collapsed. */
const shownText = (page: Page, figure: string) =>
  page
    .locator(`#${figure} > figcaption > [data-figure-state]`)
    .evaluate((element) =>
      (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

const plotOf = (page: Page, figure: string) =>
  page.locator(`#${figure} > .keyed-figure__body .lab-chart svg`);

/** Bring the figure's picture into view, then wait for both islands. */
async function hydrated(page: Page, figure: string): Promise<void> {
  await page
    .locator(`#${figure} > .keyed-figure__body`)
    .scrollIntoViewIfNeeded();
  await expect(plotOf(page, figure)).toBeVisible();
  // An island keeps its `ssr` attribute until it has hydrated.
  await page
    .locator(`#${figure} .keyed-figure__tools`)
    .scrollIntoViewIfNeeded();
  await expect(
    page.locator(`#${figure} .keyed-figure__tools astro-island`),
  ).not.toHaveAttribute('ssr', /.*/);
}

for (const { path, figure, shown } of explorers) {
  test(`${figure} states its default case in its caption, and every symbol it shows has a card`, async ({
    page,
  }) => {
    await page.goto(path);
    await hydrated(page, figure);
    await expect.poll(() => shownText(page, figure)).toBe(shown);
    // The build checks the figures it renders; what an island draws only in
    // the browser is checked on the hydrated figure (rule V3, rule N4).
    const html = await page
      .locator(`#${figure}`)
      .evaluate((element) => element.outerHTML);
    expect(unboundFigureSymbols(html)).toEqual([]);
  });
}

test('the discounting tools redraw the plot and restate the case', async ({
  page,
}) => {
  const figure = 'fig-discounting-explorer';
  await page.goto('/foundations/present-value/');
  await hydrated(page, figure);
  const before = await plotOf(page, figure).evaluate((svg) => svg.outerHTML);

  await page.getByLabel('Exact time to payment in whole years').fill('3');
  await expect
    .poll(() => shownText(page, figure))
    .toBe(
      'Shown for a future payment of USD 1,000 in 3 years at an annual rate of 5%: value today USD 863.84.',
    );
  await expect
    .poll(() => plotOf(page, figure).evaluate((svg) => svg.outerHTML))
    .not.toBe(before);
  await expect(page.locator(`#${figure} .lab-result`)).toContainText('$863.84');
});

test('the bond tools move the dot and restate the price', async ({ page }) => {
  const figure = 'fig-bond-price-yield-explorer';
  await page.goto('/bonds/price-yield-relationship/');
  await hydrated(page, figure);
  const before = await plotOf(page, figure).evaluate((svg) => svg.outerHTML);

  await page.getByLabel('Exact yield to maturity in percent').fill('7');
  await expect
    .poll(() => shownText(page, figure))
    .toBe(
      'Shown for a 5% annual coupon rate, 2 coupon payments a year and a 5-year maturity: at a 7% yield to maturity, the price is 91.68 per 100 face value.',
    );
  await expect
    .poll(() => plotOf(page, figure).evaluate((svg) => svg.outerHTML))
    .not.toBe(before);
});

test('the CDS tools redraw the legs and restate them', async ({ page }) => {
  const figure = 'fig-cds-leg-explorer';
  await page.goto('/cds/premium-protection-legs-and-par-spread/');
  await hydrated(page, figure);
  const before = await plotOf(page, figure).evaluate((svg) => svg.outerHTML);

  await page
    .getByLabel('Exact recovery rate in percent of notional')
    .fill('100');
  await expect
    .poll(() => shownText(page, figure))
    .toContain('a recovery rate of 100%');
  await expect
    .poll(() => shownText(page, figure))
    .toMatch(/protection leg USD 0\.$/);
  await expect
    .poll(() => plotOf(page, figure).evaluate((svg) => svg.outerHTML))
    .not.toBe(before);
});
