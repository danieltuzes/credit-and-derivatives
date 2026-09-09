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
  await expect(equation).toHaveAttribute('data-eq-number', '4.1');
  await expect(equation.locator('.katex-display')).toHaveCount(1);

  const number = equation.locator('a.keyed-equation__number');
  await expect(number).toHaveText('(4.1)');
  await expect(number).toHaveAttribute('href', `#${eqId}`);
  await expect(number).toHaveAttribute('aria-label', 'Equation 4.1');
});

test('a body display equation is numbered even without a `\\label`', async ({
  page,
}) => {
  await page.goto(keyedLesson);

  // This is chapter 4: the keyed equation is (4.1), and the later unkeyed
  // display equation is (4.2). The three `$$` in the `<CompactExample>` examples are
  // illustrative and stay unnumbered.
  const auto = page.locator('.keyed-equation[data-eq-auto]');
  await expect(auto).toHaveCount(1);

  const equation = auto.first();
  await expect(equation).toHaveAttribute('id', 'eq-4-2');
  await expect(equation).toHaveAttribute('data-eq-number', '4.2');
  await expect(equation.locator('.katex-display')).toHaveCount(1);

  const number = equation.locator('a.keyed-equation__number');
  await expect(number).toHaveText('(4.2)');
  await expect(number).toHaveAttribute('href', '#eq-4-2');
  await expect(number).toHaveAttribute('aria-label', 'Equation 4.2');
});

test('an auto-numbered equation is a deep-link target and takes focus on arrival', async ({
  page,
}) => {
  await page.goto(`${keyedLesson}#eq-4-2`);
  const equation = page.locator('#eq-4-2');
  await expect(equation).toBeInViewport();
  // `KeyedFloatEnhancer` moves focus onto the equation for screen-reader users;
  // the CSS `:target` flash covers the no-JS path.
  await expect(equation).toBeFocused();
});

test('clicking an auto-numbered equation number deep-links and actually highlights it', async ({
  page,
}) => {
  await page.goto(keyedLesson);
  const equation = page.locator('#eq-4-2');
  // The number is quiet (partially transparent) at rest and goes fully
  // opaque on hover; hover here so the reveal state matches a real click.
  await equation.hover();
  await equation.locator('a.keyed-equation__number').click();

  await expect(page).toHaveURL(/#eq-4-2$/);
  await expect(equation).toBeInViewport();
  // The click must land as a real same-document navigation, not merely a
  // `history.pushState` — only a real navigation sets `:target`, which is
  // what plays `eq-flash`. (Regression guard: `pushState` alone changes the
  // URL but leaves the equation looking unhighlighted.)
  await expect(equation).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('a prose `[[eq-key]]` reference renders the linked number', async ({
  page,
}) => {
  await page.goto(keyedLesson);
  const ref = page
    .locator(`a.equation-ref[data-eq-ref="discount-factor-def"]`)
    .first();
  await expect(ref).toHaveText('(4.1)');
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
  await expect(ref).toHaveText('(5.1)');
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
