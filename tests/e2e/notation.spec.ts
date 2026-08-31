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

test('renders a hovered CF_k label with MathML and a smaller subscript', async ({
  page,
}) => {
  await page.goto('/foundations/cash-flow-timelines/');

  await page
    .locator('.katex-html [data-notation-key="signed-cash-flow"] > .mathnormal')
    .first()
    .hover();

  const explanationPanel = page.locator('[data-notation-panel]');
  await expect(explanationPanel).toBeVisible();
  await expect(explanationPanel).toHaveAttribute(
    'data-active-notation-key',
    'signed-cash-flow',
  );
  await expect(explanationPanel.locator('[data-panel-title]')).toHaveText(
    'Signed cash-flow amount',
  );
  await expect(explanationPanel.locator('[data-panel-summary]')).toContainText(
    'Amount received or paid at one event',
  );
  const layer = page.locator('[data-notation-layer]');
  await layer.locator('details > summary').click();
  await layer.locator('[data-notation-control="signed-cash-flow"]').click();

  const panelSymbol = page.locator(
    '[data-notation-panel] [data-panel-symbol] .notation-symbol',
  );
  await expect(panelSymbol).toBeVisible();
  await expect(panelSymbol.locator('math msub')).toHaveCount(1);
  await expect(
    page.locator('[data-notation-panel] [data-panel-summary]'),
  ).not.toContainText(/CF_?k/);

  const baseAtom = panelSymbol.locator('.katex-html .mathnormal:not(.mtight)');
  const subscriptAtom = panelSymbol.locator('.katex-html .mathnormal.mtight');
  await expect(baseAtom).toHaveCount(2);
  await expect(subscriptAtom).toHaveCount(1);
  const baseBox = await baseAtom.last().boundingBox();
  const subscriptBox = await subscriptAtom.boundingBox();
  expect(baseBox).not.toBeNull();
  expect(subscriptBox).not.toBeNull();
  expect(subscriptBox!.height).toBeLessThan(baseBox!.height * 0.8);
});

test('opens the frequency explanation across the full m_B hover target', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/bonds/fixed-rate-contract-and-cash-flows/', {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByRole('heading', {
      name: 'Fixed-rate bond contract and cash flows',
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const frequencyMarker = page
    .getByText('The level coupon payment is', { exact: true })
    .locator('xpath=following-sibling::*[1]')
    .locator(
      '.katex-html [data-notation-key="bond-payment-frequency"]:visible',
    );
  await expect(frequencyMarker).toHaveCount(1);
  await frequencyMarker.scrollIntoViewIfNeeded();

  const markerBox = await frequencyMarker.boundingBox();
  expect(markerBox).not.toBeNull();
  if (!markerBox) return;

  const panel = page.locator('[data-notation-panel]');
  const fractions = [0.1, 0.3, 0.5, 0.7, 0.9];
  const failures: Array<{
    row: number;
    column: number;
    hitKey: string | null;
    panelKey: string | null;
    panelHidden: boolean;
  }> = [];

  for (const [row, yFraction] of fractions.entries()) {
    for (const [column, xFraction] of fractions.entries()) {
      const x = markerBox.x + markerBox.width * xFraction;
      const y = markerBox.y + markerBox.height * yFraction;

      await page.keyboard.press('Escape');
      await page.mouse.move(5, 5);
      await page.mouse.move(x, y);
      const result = await page.evaluate(
        async ({ sampleX, sampleY }) => {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          const hit = document.elementFromPoint(sampleX, sampleY);
          const explanation = document.querySelector<HTMLElement>(
            '[data-notation-panel]',
          );
          return {
            hitKey:
              hit?.closest<HTMLElement>('[data-notation-key]')?.dataset
                .notationKey ?? null,
            panelKey: explanation?.dataset.activeNotationKey ?? null,
            panelHidden: explanation?.hidden !== false,
          };
        },
        { sampleX: x, sampleY: y },
      );

      if (
        result.hitKey !== 'bond-payment-frequency' ||
        result.panelKey !== 'bond-payment-frequency' ||
        result.panelHidden
      ) {
        failures.push({ row, column, ...result });
      }
    }
  }

  expect(failures).toEqual([]);
  await expect(panel.locator('[data-panel-title]')).toHaveText(
    'Bond payment frequency',
  );
});

test('keeps an explanation for a left-edge variable inside the article column', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/foundations/cash-flow-timelines/');

  const markers = page.locator('.katex-html [data-notation-key]:visible');
  const leftmostIndex = await markers.evaluateAll((elements) => {
    const positions = elements.flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0
        ? [{ index, left: rect.left }]
        : [];
    });
    return positions.sort((left, right) => left.left - right.left)[0]?.index;
  });
  expect(leftmostIndex).toBeDefined();
  await markers.nth(leftmostIndex!).hover();

  const panel = page.locator('[data-notation-panel]');
  await expect(panel).toBeVisible();
  const panelBox = await panel.boundingBox();
  const articleBox = await page.locator('.sl-markdown-content').boundingBox();
  expect(panelBox).not.toBeNull();
  expect(articleBox).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(articleBox!.x - 1);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(
    articleBox!.x + articleBox!.width + 1,
  );
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

test('explains notation on hover from the standalone glossary', async ({
  page,
}) => {
  await page.goto('/glossary/#notation-bond-price');

  const panel = page.locator('[data-notation-panel]');
  await expect(panel).toBeHidden();

  // The definition-body \term links reveal the shared panel.
  const termLink = page.locator(
    'article#notation-bond-price .glossary-definition a.notation-term[data-notation-key="present-value"]',
  );
  await termLink.scrollIntoViewIfNeeded();
  await termLink.hover();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute(
    'data-active-notation-key',
    'present-value',
  );
  await expect(panel.locator('[data-panel-title]')).toHaveText('Present value');
  await expect(panel.locator('[data-panel-link]')).toHaveAttribute(
    'href',
    '#notation-present-value',
  );

  await page.mouse.move(2, 2);
  await expect(panel).toBeHidden();

  // The entry's own header symbol explains itself.
  const symbol = page.locator(
    'article#notation-bond-price .glossary-symbol-trigger',
  );
  await symbol.scrollIntoViewIfNeeded();
  await symbol.hover();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-active-notation-key', 'bond-price');
  await expect(panel.locator('[data-panel-title]')).toHaveText(
    'Bond price at valuation time',
  );

  // Clicking pins it open until dismissed.
  await symbol.click();
  await page.mouse.move(2, 2);
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  // Sub-expressions inside the worked definition equation are bound too: the
  // notation-registry pages now run the math-binding pipeline.
  const equationMarker = page
    .locator(
      'article#notation-bond-price .glossary-definition .katex-html [data-notation-key="discount-factor"]',
    )
    .first();
  await equationMarker.scrollIntoViewIfNeeded();
  await equationMarker.hover();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute(
    'data-active-notation-key',
    'discount-factor',
  );
  await expect(panel.locator('[data-panel-title]')).toHaveText(
    'Discount factor',
  );
  await expect(
    page.locator('.glossary-definition .katex-mathml [data-notation-key]'),
  ).toHaveCount(0);

  // The panel must clear the equation it explains, just as it does in lessons.
  const panelBox = await panel.boundingBox();
  const equationBox = await equationMarker
    .locator('xpath=ancestor::span[contains(@class,"katex-display")]')
    .boundingBox();
  expect(panelBox).not.toBeNull();
  expect(equationBox).not.toBeNull();
  const verticallyDisjoint =
    panelBox!.y >= equationBox!.y + equationBox!.height ||
    panelBox!.y + panelBox!.height <= equationBox!.y;
  expect(verticallyDisjoint).toBe(true);

  await page.mouse.move(2, 2);
  await expect(panel).toBeHidden();

  // The panel-only layer must not duplicate the article ids it mirrors.
  await expect(page.locator('[id="notation-bond-price"]')).toHaveCount(1);
});

test('glossary hover panel has no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/glossary/#notation-bond-price');
  const symbol = page.locator(
    'article#notation-bond-price .glossary-symbol-trigger',
  );
  await symbol.scrollIntoViewIfNeeded();
  await symbol.hover();
  await expect(page.locator('[data-notation-panel]')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
