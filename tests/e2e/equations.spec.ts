import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const keyedLesson = '/foundations/discount-factors/';
const eqId = 'eq-discount-factor-def';

test('a keyed display equation renders with an id, a number, and a focusable link', async ({
  page,
}) => {
  await page.goto(keyedLesson);

  const equation = page.locator(`.keyed-equation#${eqId}`);
  await expect(equation).toBeVisible();
  await expect(equation).toHaveAttribute('data-eq-number', '2.1');
  await expect(equation.locator('.katex-display')).toHaveCount(1);

  const number = equation.locator('a.keyed-equation__number');
  await expect(number).toHaveText('(2.1)');
  await expect(number).toHaveAttribute('href', `#${eqId}`);
  await expect(number).toHaveAttribute('aria-label', 'Equation 2.1');
});

test('a body display equation is numbered even without a `\\label`', async ({
  page,
}) => {
  await page.goto(keyedLesson);

  // `## Undo accumulation` (section 2) holds the one keyed equation (2.1);
  // `## Meaning before arithmetic` (section 3) opens with an unkeyed one, now
  // (3.1). The three `$$` in the `<CompactExample>` worked examples are
  // illustrative and stay unnumbered.
  const auto = page.locator('.keyed-equation[data-eq-auto]');
  await expect(auto).toHaveCount(1);

  const equation = auto.first();
  await expect(equation).toHaveAttribute('id', 'eq-3-1');
  await expect(equation).toHaveAttribute('data-eq-number', '3.1');
  await expect(equation.locator('.katex-display')).toHaveCount(1);

  const number = equation.locator('a.keyed-equation__number');
  await expect(number).toHaveText('(3.1)');
  await expect(number).toHaveAttribute('href', '#eq-3-1');
  await expect(number).toHaveAttribute('aria-label', 'Equation 3.1');
});

test('an auto-numbered equation is a deep-link target and takes focus on arrival', async ({
  page,
}) => {
  await page.goto(`${keyedLesson}#eq-3-1`);
  const equation = page.locator('#eq-3-1');
  await expect(equation).toBeInViewport();
  // `EquationEnhancer` moves focus onto the equation for screen-reader users;
  // the CSS `:target` flash covers the no-JS path.
  await expect(equation).toBeFocused();
});

test('clicking an auto-numbered equation number updates the URL with its anchor', async ({
  page,
}) => {
  await page.goto(keyedLesson);
  // The number is transparent until hover/focus; `force` clicks it anyway (an
  // `opacity:0` link is still hit-testable), exercising the click → deep-link.
  await page.locator('#eq-3-1 a.keyed-equation__number').click({ force: true });
  await expect(page).toHaveURL(/#eq-3-1$/);
  await expect(page.locator('#eq-3-1')).toBeInViewport();
});

test('a prose `[[eq-key]]` reference renders the linked number', async ({
  page,
}) => {
  await page.goto(keyedLesson);
  const ref = page
    .locator(`a.equation-ref[data-eq-ref="discount-factor-def"]`)
    .first();
  await expect(ref).toHaveText('(2.1)');
  await expect(ref).toHaveAttribute('href', `#${eqId}`);
});

test('a deep link scrolls the equation into view and moves focus (JS on)', async ({
  page,
}) => {
  await page.goto(`${keyedLesson}#${eqId}`);
  const equation = page.locator(`#${eqId}`);
  await expect(equation).toBeInViewport();
  // The enhancer moves focus onto the equation for screen-reader users.
  await expect(equation).toBeFocused();
});

test('the deep-link target lands in view with JavaScript disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${keyedLesson}#${eqId}`);
  await expect(page.locator(`#${eqId}`)).toBeInViewport();
  await context.close();
});

test('a cross-lesson reference points at the other page anchor', async ({
  page,
}) => {
  await page.goto('/bonds/price-from-discount-factors/');
  const ref = page.locator('a.equation-ref[data-eq-lesson]').first();
  await expect(ref).toHaveText('(2.1)');
  await expect(ref).toHaveAttribute(
    'href',
    /\/foundations\/present-value\/#eq-present-value-sum$/,
  );
});

test('axe is clean on a lesson with a targeted keyed equation', async ({
  page,
}) => {
  await page.goto(`${keyedLesson}#${eqId}`);
  const results = await new AxeBuilder({ page })
    .include('.sl-markdown-content')
    .analyze();
  expect(results.violations).toEqual([]);
});
