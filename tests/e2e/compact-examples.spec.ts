import { expect, test } from '@playwright/test';

const lessons = [
  {
    path: '/foundations/cash-flow-timelines/',
    labels: [
      'Read a timeline',
      'Reverse the perspective',
      'Same amount, different time',
    ],
  },
  {
    path: '/foundations/rates-compounding-and-basis-points/',
    labels: [
      'Nominal 6%, compounded semiannually',
      'Nominal is not effective annual',
      'Basis-point arithmetic',
    ],
  },
  {
    path: '/foundations/discount-factors/',
    labels: [
      'Annual compounding',
      'Semiannual compounding',
      'Read a small curve',
    ],
  },
  {
    path: '/foundations/present-value/',
    labels: ['One payment', 'Mixed signed cash flows', 'Additivity'],
  },
  {
    path: '/bonds/fixed-rate-contract-and-cash-flows/',
    labels: ['Annual coupons', 'Semiannual coupons', 'Quarterly coupon amount'],
  },
  {
    path: '/bonds/price-from-discount-factors/',
    labels: [
      'Two supplied factors',
      'Unfamiliar schedule',
      'Zero-coupon boundary',
    ],
  },
  {
    path: '/bonds/yield-to-maturity/',
    labels: [
      'Annual payments',
      'Semiannual compounding',
      'Zero-coupon special case',
    ],
  },
  {
    path: '/bonds/price-yield-relationship/',
    labels: [
      'Three points form a curve',
      'Equal shocks, unequal moves',
      'Hold other inputs fixed',
    ],
  },
] as const;

for (const { path, labels } of lessons) {
  test(`${path} starts collapsed and exposes three labeled tabs`, async ({
    page,
  }) => {
    await page.goto(path);

    const examples = page.locator('compact-examples');
    const disclosure = examples.locator(':scope > details');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await expect(
      examples.locator('[data-compact-example]').first(),
    ).toBeHidden();

    const notationAudit = await examples.evaluate((root) => {
      const unmarkedVariables = Array.from(
        root.querySelectorAll<HTMLElement>('.katex-html .mord'),
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
        hasLiteralTerm: root.innerHTML.includes('\\term{'),
        katexErrors: root.querySelectorAll('.katex-error').length,
        unmarkedVariables,
      };
    });
    expect(notationAudit, `${path} compact-example notation`).toEqual({
      hasLiteralTerm: false,
      katexErrors: 0,
      unmarkedVariables: [],
    });

    await examples.locator('summary').click();
    await expect(disclosure).toHaveAttribute('open', '');

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

  const examples = page.locator('compact-examples');
  await examples.locator('summary').click();
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

  const examples = page.locator('compact-examples');
  await examples.locator('summary').click();
  await expect(
    examples.locator('.katex-html [data-notation-key="nominal-annual-rate"]'),
  ).toBeVisible();
  await expect(
    examples.locator('.katex-html [data-notation-key="periodic-rate"]'),
  ).toBeVisible();
  await expect(examples).not.toContainText('\\term{');
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
    const examples = page.locator('compact-examples');
    const disclosure = examples.locator(':scope > details');

    await expect(examples.getByRole('tab')).toHaveCount(0);
    await expect(disclosure).not.toHaveAttribute('open', '');
    await examples.locator('summary').click();
    await expect(disclosure).toHaveAttribute('open', '');

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

test('print media reveals every example even while the disclosure is closed', async ({
  page,
}) => {
  await page.goto('/foundations/discount-factors/');
  const examples = page.locator('compact-examples');
  await expect(examples.locator(':scope > details')).not.toHaveAttribute(
    'open',
    '',
  );
  await expect(examples.locator('[role="tabpanel"]')).toHaveCount(3);

  await page.emulateMedia({ media: 'print' });
  for (const panel of await examples.locator('[role="tabpanel"]').all()) {
    await expect(panel).toBeVisible();
  }
});
