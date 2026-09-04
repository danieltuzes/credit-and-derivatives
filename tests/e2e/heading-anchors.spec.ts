import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const lesson = '/foundations/discount-factors/';
const headingId = 'undo-accumulation';

test('content headings get a wrapper and a same-page anchor link', async ({
  page,
}) => {
  await page.goto(lesson);

  const wrapper = page
    .locator('.sl-markdown-content .sl-heading-wrapper')
    .filter({ has: page.locator('h2') })
    .first();
  await expect(wrapper).toBeVisible();

  const heading = wrapper.locator('h2');
  const id = await heading.getAttribute('id');
  expect(id).toBeTruthy();

  const link = wrapper.locator('a.sl-anchor-link');
  await expect(link).toHaveAttribute('href', `#${id}`);
  // Discernible name for assistive tech even though the icon is decorative.
  await expect(link.locator('.sr-only')).toHaveText(/Section titled/);
});

test('clicking a heading anchor deep-links, scrolls, highlights, and moves focus (JS on)', async ({
  page,
}) => {
  await page.goto(lesson);

  const wrapper = page
    .locator('.sl-markdown-content .sl-heading-wrapper')
    .filter({ has: page.locator(`h2#${headingId}`) });
  await wrapper.hover();
  await wrapper.locator('a.sl-anchor-link').click();

  await expect(page).toHaveURL(new RegExp(`#${headingId}$`));
  await expect(page.locator(`#${headingId}`)).toBeInViewport();
  await expect(page.locator(`#${headingId}`)).toBeFocused();
  // The click must land as a real same-document navigation, not merely a
  // `history.pushState` — only a real navigation sets `:target`, which is
  // what plays `heading-flash`. (Regression guard: `pushState` alone changes
  // the URL but leaves the section looking unhighlighted.)
  await expect(wrapper).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('a heading deep link lands in view with JavaScript disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${lesson}#${headingId}`);
  await expect(page.locator(`#${headingId}`)).toBeInViewport();
  await context.close();
});

test('axe is clean on a lesson with a targeted heading', async ({ page }) => {
  await page.goto(`${lesson}#${headingId}`);
  const results = await new AxeBuilder({ page })
    .include('.sl-markdown-content')
    .analyze();
  expect(results.violations).toEqual([]);
});
