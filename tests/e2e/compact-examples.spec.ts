import { expect, test } from '@playwright/test';

const lessons = [
  {
    path: '/foundations/cash-flow-timelines/',
    id: 'reading-cash-flow-timelines',
    labels: [
      'Read a timeline',
      'Reverse the perspective',
      'Same amount, different time',
    ],
  },
  {
    path: '/foundations/probability-events-and-expectation/',
    id: 'expectation-over-events',
    labels: [
      'Constant value on each event',
      'Conditional means inside events',
      'Default inside a period',
    ],
  },
  {
    path: '/foundations/rates-compounding-and-basis-points/',
    id: 'compounding-and-basis-points',
    labels: [
      'Nominal 6%, compounded semiannually',
      'Nominal is not effective annual',
      'Basis-point arithmetic',
    ],
  },
  {
    path: '/foundations/discount-factors/',
    id: 'discount-factor-calculations',
    labels: [
      'Annual compounding',
      'Semiannual compounding',
      'Read a small curve',
    ],
  },
  {
    path: '/foundations/present-value/',
    id: 'present-value-calculations',
    labels: ['One payment', 'Mixed signed cash flows', 'Additivity'],
  },
  {
    path: '/bonds/fixed-rate-contract-and-cash-flows/',
    id: 'coupon-schedules',
    labels: ['Annual coupons', 'Semiannual coupons', 'Quarterly coupon amount'],
  },
  {
    path: '/bonds/price-from-discount-factors/',
    id: 'bond-price-from-discount-factors',
    labels: [
      'Two discount factors',
      'Unfamiliar schedule',
      'Zero-coupon boundary',
    ],
  },
  {
    path: '/bonds/yield-to-maturity/',
    id: 'yield-to-maturity-pricing',
    labels: [
      'Annual payments',
      'Semiannual compounding',
      'Zero-coupon special case',
    ],
  },
  {
    path: '/bonds/price-yield-relationship/',
    id: 'price-yield-comparisons',
    labels: [
      'Three points form a curve',
      'Equal shocks, unequal price changes',
      'Hold other inputs fixed',
    ],
  },
  {
    path: '/credit/default-hazard-and-survival/',
    id: 'survival-and-default-probabilities',
    labels: [
      'One interval drop',
      'Three years at constant hazard',
      'Two unequal interval drops',
    ],
  },
  {
    path: '/credit/recovery-and-risky-present-value/',
    id: 'recovery-of-par-present-values',
    labels: [
      'Partial recovery',
      'Zero-recovery boundary',
      'Full-recovery boundary',
    ],
  },
  {
    path: '/cds/premium-protection-legs-and-par-spread/',
    id: 'exact-cds-legs',
    labels: [
      'A finite event partition',
      'One-year exact legs',
      'Solve the exact par spread',
    ],
  },
] as const;

type Page = import('@playwright/test').Page;

// A set of worked examples is a section of its own (explico 0.10): its
// `<h2 id="ex-‹id›">` is the bar of the section fold `CollapsibleSections`
// builds around the set, and it starts as `disclosure.workedExamples` says
// (closed, the engine default this course keeps).
const setOf = (page: Page, id: string) =>
  page.locator('compact-examples').filter({ has: page.locator(`#ex-${id}`) });
const foldOf = (page: Page, id: string) =>
  page.locator(`#ex-${id}`).locator('xpath=ancestor::details[1]');
const openSet = async (page: Page, id: string) => {
  const fold = foldOf(page, id);
  await fold.locator(':scope > summary').click();
  await expect(fold).toHaveJSProperty('open', true);
};

for (const { path, id, labels } of lessons) {
  test(`${path} starts folded and exposes three labeled tabs`, async ({
    page,
  }) => {
    await page.goto(path);

    const examples = setOf(page, id);
    await expect(examples).toHaveCount(1);
    await expect(foldOf(page, id)).toHaveJSProperty('open', false);
    for (const panel of await examples
      .locator('[data-compact-example]')
      .all()) {
      await expect(panel).toBeHidden();
    }

    const notationAudit = await page
      .locator('compact-examples')
      .evaluateAll((roots) => {
        const unmarkedVariables = roots
          .flatMap((root) =>
            Array.from(root.querySelectorAll<HTMLElement>('.katex-html .mord')),
          )
          .filter((element) => {
            if (element.childElementCount > 0) return false;
            if (element.closest('[data-notation-key]')) return false;

            const text = element.textContent?.trim() ?? '';
            const isVariable = element.classList.contains('mathnormal');
            const isGreekVariable =
              /^\p{Script=Greek}$/u.test(text) &&
              !element.classList.contains('mathrm') &&
              !element.classList.contains('text');
            return isVariable || isGreekVariable;
          })
          .map((element) => element.textContent?.trim());

        return {
          hasLiteralTerm: roots.some((root) => root.innerHTML.includes('[[')),
          katexErrors: roots.reduce(
            (count, root) =>
              count + root.querySelectorAll('.katex-error').length,
            0,
          ),
          unmarkedVariables,
        };
      });
    expect(notationAudit, `${path} compact-example notation`).toEqual({
      hasLiteralTerm: false,
      katexErrors: 0,
      unmarkedVariables: [],
    });

    await openSet(page, id);

    const tabs = examples.getByRole('tab');
    const panels = examples.locator('[role="tabpanel"]');
    await expect(tabs).toHaveCount(3);
    await expect(panels).toHaveCount(3);
    await expect(tabs).toHaveText(labels);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(panels.first()).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
    await expect(panels.nth(2)).toBeHidden();
  });
}

test('example tabs support arrow, Home, and End keyboard navigation', async ({
  page,
}) => {
  await page.goto('/foundations/rates-compounding-and-basis-points/');

  const id = 'compounding-and-basis-points';
  await openSet(page, id);
  const examples = setOf(page, id);
  const tabs = examples.getByRole('tab');
  const panels = examples.locator('[role="tabpanel"]');

  await tabs.first().focus();
  await tabs.first().press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(panels.nth(1)).toBeVisible();

  await tabs.nth(1).press('End');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(panels.nth(2)).toBeVisible();

  await tabs.nth(2).press('Home');
  await expect(tabs.first()).toBeFocused();
  await expect(panels.first()).toBeVisible();

  await tabs.first().press('ArrowLeft');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(panels.nth(2)).toBeVisible();
});

test('notation remains compiled inside compact example components', async ({
  page,
}) => {
  await page.goto('/foundations/rates-compounding-and-basis-points/');

  const id = 'compounding-and-basis-points';
  await openSet(page, id);
  const examples = setOf(page, id);
  await expect(
    examples.locator('.katex-html [data-notation-key="nominal-annual-rate"]'),
  ).toBeVisible();
  await expect(
    examples.locator('.katex-html [data-notation-key="periodic-rate"]'),
  ).toBeVisible();
  await expect(examples).not.toContainText('[[');
});

test('all examples remain available when JavaScript is disabled', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();

  try {
    await page.goto('/foundations/cash-flow-timelines/');
    const examples = setOf(page, lessons[0].id);

    // No script: no tabs and no fold, so every example reads in turn.
    await expect(examples.getByRole('tab')).toHaveCount(0);
    const panels = examples.locator('[data-compact-example]');
    await expect(panels).toHaveCount(3);
    for (const panel of await panels.all()) {
      await expect(panel).toBeVisible();
    }

    for (const label of lessons[0].labels) {
      await expect(
        examples.getByRole('heading', { level: 3, name: label }),
      ).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

test('print follows the screen: a folded set prints its heading, an open set every example', async ({
  page,
}) => {
  await page.goto('/foundations/discount-factors/');
  const id = 'discount-factor-calculations';
  const examples = setOf(page, id);
  const panels = examples.locator('[role="tabpanel"]');
  await expect(foldOf(page, id)).toHaveJSProperty('open', false);
  await expect(panels).toHaveCount(3);

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator(`#ex-${id}`)).toBeVisible();
  for (const panel of await panels.all()) {
    await expect(panel).toBeHidden();
  }

  await page.emulateMedia({ media: 'screen' });
  await openSet(page, id);
  await page.emulateMedia({ media: 'print' });
  for (const panel of await panels.all()) {
    await expect(panel).toBeVisible();
  }
});
