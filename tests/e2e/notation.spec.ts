import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const lessonPath = '/foundations/discount-factors/';

/** The floating card for `key` — see `popup-stack.ts`. At most one exists
 *  per key at a time; it is a real DOM node, created on open and removed
 *  on close (not merely hidden). */
const popupFor = (page: import('@playwright/test').Page, key: string) =>
  page.locator(`.notation-popup[data-popup-key="${key}"]`);

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
  const popup = popupFor(page, 'discount-factor');
  await expect(control).toBeVisible();
  await control.focus();
  await page.keyboard.press('Enter');

  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(control).toHaveAttribute('aria-expanded', 'true');
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-slot-title]')).toHaveText(
    'Discount factor',
  );
  await expect(popup.locator('[data-slot-link]')).toHaveAttribute(
    'href',
    '/glossary/#notation-discount-factor',
  );

  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();
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

  const popup = popupFor(page, 'signed-cash-flow');
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-slot-title]')).toHaveText(
    'Signed cash flow',
  );
  await expect(popup.locator('[data-slot-summary]')).toContainText(
    'Amount received or paid at one event',
  );
  const layer = page.locator('[data-notation-layer]');
  await layer.locator('details > summary').click();
  await layer.locator('[data-notation-control="signed-cash-flow"]').click();

  const panelSymbol = popup.locator('[data-slot-symbol] .notation-symbol');
  await expect(panelSymbol).toBeVisible();
  await expect(panelSymbol.locator('math msub')).toHaveCount(1);
  await expect(popup.locator('[data-slot-summary]')).not.toContainText(/CF_?k/);

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

  const popup = popupFor(page, 'bond-payment-frequency');
  const fractions = [0.1, 0.3, 0.5, 0.7, 0.9];
  const failures: Array<{
    row: number;
    column: number;
    hitKey: string | null;
    popupOpen: boolean;
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
          const openPopup = document.querySelector<HTMLElement>(
            '.notation-popup[data-popup-key="bond-payment-frequency"]',
          );
          return {
            hitKey:
              hit?.closest<HTMLElement>('[data-notation-key]')?.dataset
                .notationKey ?? null,
            popupOpen: openPopup !== null,
          };
        },
        { sampleX: x, sampleY: y },
      );

      if (result.hitKey !== 'bond-payment-frequency' || !result.popupOpen) {
        failures.push({ row, column, ...result });
      }
    }
  }

  expect(failures).toEqual([]);
  await expect(popup.locator('[data-slot-title]')).toHaveText(
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

  const popup = page.locator('.notation-popup');
  await expect(popup).toBeVisible();
  const popupBox = await popup.boundingBox();
  const articleBox = await page.locator('.sl-markdown-content').boundingBox();
  expect(popupBox).not.toBeNull();
  expect(articleBox).not.toBeNull();
  expect(popupBox!.x).toBeGreaterThanOrEqual(articleBox!.x - 1);
  expect(popupBox!.x + popupBox!.width).toBeLessThanOrEqual(
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
  await expect(popupFor(page, 'discount-factor')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[data-notation-layer]')
    .analyze();
  expect(results.violations).toEqual([]);
});

test('explains notation on hover from the standalone glossary', async ({
  page,
}) => {
  await page.goto('/glossary/#notation-bond-price');

  await expect(page.locator('.notation-popup')).toHaveCount(0);

  // The definition-body \term links reveal a card.
  const termLink = page.locator(
    'article#notation-bond-price .glossary-definition a.notation-term[data-notation-key="present-value"]',
  );
  const presentValuePopup = popupFor(page, 'present-value');
  await termLink.scrollIntoViewIfNeeded();
  await termLink.hover();
  await expect(presentValuePopup).toBeVisible();
  await expect(presentValuePopup.locator('[data-slot-title]')).toHaveText(
    'Present value',
  );
  await expect(presentValuePopup.locator('[data-slot-link]')).toHaveAttribute(
    'href',
    '#notation-present-value',
  );

  await page.mouse.move(2, 2);
  await expect(presentValuePopup).toBeHidden();

  // The entry's own header symbol explains itself.
  const symbol = page.locator(
    'article#notation-bond-price .glossary-symbol-trigger',
  );
  const bondPricePopup = popupFor(page, 'bond-price');
  await symbol.scrollIntoViewIfNeeded();
  await symbol.hover();
  await expect(bondPricePopup).toBeVisible();
  await expect(bondPricePopup.locator('[data-slot-title]')).toHaveText(
    'Bond price',
  );

  // Clicking pins it open until dismissed.
  await symbol.click();
  await page.mouse.move(2, 2);
  await expect(bondPricePopup).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bondPricePopup).toBeHidden();

  // Sub-expressions inside the worked definition equation are bound too: the
  // notation-registry pages now run the math-binding pipeline.
  const equationMarker = page
    .locator(
      'article#notation-bond-price .glossary-definition .katex-html [data-notation-key="discount-factor"]',
    )
    .first();
  const discountFactorPopup = popupFor(page, 'discount-factor');
  await equationMarker.scrollIntoViewIfNeeded();
  await equationMarker.hover();
  await expect(discountFactorPopup).toBeVisible();
  await expect(discountFactorPopup.locator('[data-slot-title]')).toHaveText(
    'Discount factor',
  );
  await expect(
    page.locator('.glossary-definition .katex-mathml [data-notation-key]'),
  ).toHaveCount(0);

  // The card must clear the equation it explains, just as it does in lessons.
  const popupBox = await discountFactorPopup.boundingBox();
  const equationBox = await equationMarker
    .locator('xpath=ancestor::span[contains(@class,"katex-display")]')
    .boundingBox();
  expect(popupBox).not.toBeNull();
  expect(equationBox).not.toBeNull();
  const verticallyDisjoint =
    popupBox!.y >= equationBox!.y + equationBox!.height ||
    popupBox!.y + popupBox!.height <= equationBox!.y;
  expect(verticallyDisjoint).toBe(true);

  await page.mouse.move(2, 2);
  await expect(discountFactorPopup).toBeHidden();

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
  await expect(popupFor(page, 'bond-price')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

/**
 * The two-tier vocabulary (D15): a card's rigorous formula is visible on the
 * glossary, its symbols are live, and a symbol with no card of its own — a
 * gloss — still has somewhere to say its name.
 */
test('explores a rigorous formula and its glosses from the glossary', async ({
  page,
}) => {
  await page.goto('/glossary/#notation-expectation');

  const article = page.locator('article#notation-expectation');

  // The formula is rendered on the card, not hidden behind a popup.
  const formula = article.locator('.glossary-formula');
  await expect(formula).toBeVisible();

  // A card symbol inside the formula explains itself.
  const cardGlyph = formula
    .locator('.katex-html [data-notation-key="expectation"]')
    .first();
  const expectationPopup = popupFor(page, 'expectation');
  await cardGlyph.scrollIntoViewIfNeeded();
  await cardGlyph.hover();
  await expect(expectationPopup).toBeVisible();
  await expect(expectationPopup.locator('[data-slot-title]')).toHaveText(
    'Expectation',
  );

  await page.mouse.move(2, 2);
  await expect(expectationPopup).toBeHidden();

  // A gloss inside the same formula explains itself too — symbol and name,
  // and no "open the full definition" link, because it has no card.
  const glossGlyph = formula
    .locator('.katex-html [data-notation-key="expectation.sample-space"]')
    .first();
  const samplespacePopup = popupFor(page, 'expectation.sample-space');
  await glossGlyph.scrollIntoViewIfNeeded();
  await glossGlyph.hover();
  await expect(samplespacePopup).toBeVisible();
  await expect(samplespacePopup.locator('[data-slot-title]')).toHaveText(
    'sample space',
  );
  await expect(samplespacePopup.locator('[data-slot-link]')).toBeHidden();
  await expect(samplespacePopup.locator('[data-slot-summary]')).toBeHidden();

  await page.mouse.move(2, 2);
  await expect(samplespacePopup).toBeHidden();
});

test('clicking a symbol inside an open notation card opens an additional card beside it', async ({
  page,
}) => {
  await page.goto('/glossary/#notation-expectation');

  const symbol = page.locator(
    'article#notation-expectation .glossary-symbol-trigger',
  );
  const expectationPopup = popupFor(page, 'expectation');
  await symbol.scrollIntoViewIfNeeded();
  await symbol.click();
  await expect(expectationPopup).toBeVisible();
  await expect(expectationPopup.locator('[data-slot-title]')).toHaveText(
    'Expectation',
  );

  // The card carries the entry's own formula, and its glyphs are live.
  const outcomeTrigger = expectationPopup
    .locator('[data-slot-formula] [data-notation-key="expectation.outcome"]')
    .first();
  const outcomePopup = popupFor(page, 'expectation.outcome');
  await outcomeTrigger.click();
  await expect(outcomePopup).toBeVisible();
  await expect(outcomePopup.locator('[data-slot-title]')).toHaveText('outcome');
  // Opening the child did not replace the parent.
  await expect(expectationPopup).toBeVisible();
  await expect(expectationPopup.locator('[data-slot-title]')).toHaveText(
    'Expectation',
  );

  // Closing just the child (its own card body, not the "×") leaves the
  // parent open.
  await outcomePopup.locator('[data-slot-title]').click();
  await expect(outcomePopup).toBeHidden();
  await expect(expectationPopup).toBeVisible();

  // Closing the parent (its own card body) takes any child with it —
  // nothing is left pointing at a symbol that's gone. Reopen the child
  // first to prove the cascade.
  await outcomeTrigger.click();
  await expect(outcomePopup).toBeVisible();
  await expectationPopup.locator('[data-slot-title]').click();
  await expect(expectationPopup).toBeHidden();
  await expect(outcomePopup).toBeHidden();
});

test('keeps the formula and every gloss name readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/glossary/#notation-expectation');

  const article = page.locator('article#notation-expectation');
  await expect(article.locator('.glossary-meaning')).toBeVisible();
  await expect(
    article.locator('.glossary-formula .notation-formula-math .katex').first(),
  ).toBeVisible();

  // A gloss has no card, so this list is the whole of it with JS off.
  const glosses = article.locator('[data-notation-gloss-list]');
  await expect(glosses).toBeVisible();
  await expect(
    glosses.locator('[data-notation-gloss="expectation.sample-space"]'),
  ).toContainText('sample space');
  await expect(
    glosses.locator('[data-notation-gloss="expectation.probability-measure"]'),
  ).toContainText('dimensionless probability weights between zero and one');

  await context.close();
});

/**
 * A card's formula carries live glyphs (D15), and a lesson page runs the
 * citation layer alongside the notation layer. Both traps below were found
 * live on `/foundations/risk-neutral-pricing/`: hovering a symbol inside an
 * already-open card silently replaced it instead of explaining the nested
 * symbol too, and a pinned citation and an open notation card could both
 * stay visible at once, landing on top of each other.
 */
const riskNeutralPricingPath = '/foundations/risk-neutral-pricing/';

test('clicking a gloss inside an open notation card opens it as an additional pinned card', async ({
  page,
}) => {
  await page.goto(riskNeutralPricingPath);

  const layer = page.locator('[data-notation-layer]');
  await layer.locator('details.notation-list > summary').click();

  const expectationPopup = popupFor(page, 'expectation');
  const dtIcon = page.locator(
    'dt [data-notation-symbol-trigger][data-notation-key="expectation"]',
  );
  await dtIcon.click();
  await expect(expectationPopup).toBeVisible();
  await expect(expectationPopup.locator('[data-slot-title]')).toHaveText(
    'Expectation',
  );

  // A gloss (here: the random variable X) has no card of its own — clicking
  // it must open its own additional card, not empty out the one already
  // open.
  const glyph = expectationPopup
    .locator(
      '[data-slot-formula] [data-notation-key="expectation.random-variable"]',
    )
    .first();
  const xPopup = popupFor(page, 'expectation.random-variable');
  await glyph.click();

  await expect(expectationPopup).toBeVisible();
  await expect(expectationPopup.locator('[data-slot-title]')).toHaveText(
    'Expectation',
  );
  await expect(xPopup).toBeVisible();
  await expect(xPopup.locator('[data-slot-title]')).toHaveText(
    'random variable',
  );
  await expect(xPopup.locator('[data-slot-link]')).toBeHidden();
});

test('hovering a symbol inside a pinned card opens an additional, unpinned card', async ({
  page,
}) => {
  await page.goto(riskNeutralPricingPath);

  const expectationPopup = popupFor(page, 'expectation');
  const expectationTrigger = page
    .locator('.katex-html [data-notation-key="expectation"]')
    .first();

  // Hover, then click the same trigger to pin — the reported sequence.
  await expectationTrigger.scrollIntoViewIfNeeded();
  await expectationTrigger.hover();
  await expectationTrigger.click();
  await expect(expectationPopup).toBeVisible();
  await expect(expectationPopup.locator('[data-slot-title]')).toHaveText(
    'Expectation',
  );

  // Merely pointing at a symbol inside the pinned card's own formula opens
  // an additional card explaining it — not just a help cursor, and not a
  // replacement of the card already open.
  const xTrigger = expectationPopup
    .locator(
      '[data-slot-formula] [data-notation-key="expectation.random-variable"]',
    )
    .first();
  const xPopup = popupFor(page, 'expectation.random-variable');
  await xTrigger.hover();
  await expect(xPopup).toBeVisible();
  await expect(xPopup.locator('[data-slot-title]')).toHaveText(
    'random variable',
  );
  await expect(expectationPopup).toBeVisible();
  await expect(expectationPopup.locator('[data-slot-title]')).toHaveText(
    'Expectation',
  );

  // It was only a hover, not a pin: moving the pointer off it (and off the
  // parent) closes it on its own, while the pinned parent stays open.
  await page.mouse.move(2, 2);
  await expect(xPopup).toBeHidden();
  await expect(expectationPopup).toBeVisible();

  // A different nested symbol behaves the same way.
  const omegaTrigger = expectationPopup
    .locator(
      '[data-slot-formula] [data-notation-key="expectation.sample-space"]',
    )
    .first();
  const omegaPopup = popupFor(page, 'expectation.sample-space');
  await omegaTrigger.hover();
  await expect(omegaPopup).toBeVisible();
  await expect(omegaPopup.locator('[data-slot-title]')).toHaveText(
    'sample space',
  );

  await page.mouse.move(2, 2);
  await expect(omegaPopup).toBeHidden();
  await expect(expectationPopup).toBeVisible();
});

test('a pinned card can be closed by clicking its own body, or its corner "×"', async ({
  page,
}) => {
  await page.goto(riskNeutralPricingPath);

  const expectationPopup = popupFor(page, 'expectation');
  const expectationTrigger = page
    .locator('.katex-html [data-notation-key="expectation"]')
    .first();
  await expectationTrigger.scrollIntoViewIfNeeded();
  await expectationTrigger.click();
  await expect(expectationPopup).toBeVisible();

  // Clicking the card's own body (not a nested symbol, not a link) collapses
  // it — the same gesture the reader would use to dismiss any card.
  await expectationPopup.locator('[data-slot-title]').click();
  await expect(expectationPopup).toBeHidden();

  // The corner "×" does the same.
  await expectationTrigger.click();
  await expect(expectationPopup).toBeVisible();
  await expectationPopup.locator('[data-popup-close]').click();
  await expect(expectationPopup).toBeHidden();

  // Clicking the *equation* itself — the unexplained parts included — is
  // never treated as "closing a card": there is no card to collapse there.
  await expectationTrigger.click();
  await expect(expectationPopup).toBeVisible();
  const unexplainedEquation = page.locator('.katex-display').first();
  await unexplainedEquation.click({ position: { x: 4, y: 4 }, force: true });
  await expect(expectationPopup).toBeVisible();
});

test('a hovered notation card closes and unpins a pinned citation, never overlapping it', async ({
  page,
}) => {
  await page.goto(riskNeutralPricingPath);

  const citationPanel = page.locator('[data-citation-panel]');
  const notationPopup = popupFor(page, 'expectation');

  const citationMarker = page
    .locator('a.citation-ref[data-citation-id]')
    .first();
  await citationMarker.scrollIntoViewIfNeeded();
  await citationMarker.hover();
  await expect(citationPanel).toBeVisible();
  await citationPanel.locator('[data-panel-pin]').click();
  await expect(citationPanel.locator('[data-panel-pin]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const expectationTrigger = page
    .locator('.katex-html [data-notation-key="expectation"]')
    .first();
  await expectationTrigger.scrollIntoViewIfNeeded();
  await expectationTrigger.hover();

  // The notation and citation surfaces are mutually exclusive groups: the
  // notation glyph took over, so the pinned citation must be gone — not
  // lurking underneath, and not one stray blur event away from popping back
  // on top of it.
  await expect(notationPopup).toBeVisible();
  await expect(citationPanel).toBeHidden();
  await expect(citationPanel.locator('[data-panel-pin]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await page.mouse.move(2, 2);
  await expect(notationPopup).toBeHidden();
  await expect(citationPanel).toBeHidden();
});
