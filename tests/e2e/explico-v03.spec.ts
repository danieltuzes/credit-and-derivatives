import { expect, test } from '@playwright/test';

test('the v0.3 About panel exposes course and engine versions', async ({
  page,
}) => {
  await page.goto('/foundations/discount-factors/');

  const panel = page.getByRole('banner').locator('details[data-about-panel]');
  await panel.locator('summary').click();
  await expect(panel).toHaveAttribute('open', '');
  await expect(panel.locator('dd').nth(0)).toHaveText('0.2.0 · 2026-09-06');
  await expect(panel.locator('dd').nth(1)).toHaveText('explico 0.3.0');
  await expect(
    panel.getByRole('link', { name: 'What changed' }),
  ).toHaveAttribute('href', /content\/CHANGELOG\.md$/);
});

const diagrams = [
  {
    path: '/derivatives/multiperiod-lattice-valuation/',
    id: 'backward-induction-flow',
    nodeCount: 5,
  },
  {
    path: '/bond-options/european-bond-options/',
    id: 'bond-option-valuation-flow',
    nodeCount: 3,
  },
  {
    path: '/bond-options/issuer-default-knockout/',
    id: 'knockout-bond-option-flow',
    nodeCount: 3,
  },
] as const;

for (const diagram of diagrams) {
  test(`${diagram.id} uses the static v0.3 diagram renderer`, async ({
    page,
  }) => {
    await page.goto(diagram.path);

    const figure = page.locator(`#diagram-${diagram.id}`);
    await expect(figure).toBeVisible();
    await expect(figure.locator('svg')).toBeVisible();
    await expect(figure.locator('.diagram-node')).toHaveCount(
      diagram.nodeCount,
    );
    await expect(figure.locator('.diagram-scroll')).toHaveAttribute(
      'tabindex',
      '0',
    );
    await expect(figure.locator('.diagram-fallback')).toContainText(
      'Diagram description',
    );
  });
}

test('a wide diagram scrolls instead of shrinking its labels', async ({
  page,
}) => {
  await page.goto('/derivatives/multiperiod-lattice-valuation/');
  const scroller = page.locator(
    '#diagram-backward-induction-flow .diagram-scroll',
  );
  const dimensions = await scroller.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
});
