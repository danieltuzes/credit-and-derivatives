import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

// Both versions have one golden source each, so this spec reads them instead
// of repeating them: a hard-coded version turns every routine bump into a
// test edit.
const knowledgeVersion = readFileSync(
  fileURLToPath(new URL('../../content/CHANGELOG.md', import.meta.url)),
  'utf8',
).match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
const engineVersion: string = createRequire(import.meta.url)(
  'explico/package.json',
).version;

test('the About panel publishes the knowledge and engine versions', async ({
  page,
}) => {
  expect(
    knowledgeVersion,
    'content/CHANGELOG.md has no released version',
  ).toBeDefined();
  await page.goto('/foundations/discount-factors/');

  const panel = page.getByRole('banner').locator('details[data-about-panel]');
  // The panel publishes the identity it displays, so the check is exact and
  // scoped to the panel rather than a version substring anywhere on the page.
  await expect(panel).toHaveAttribute(
    'data-knowledge-version',
    knowledgeVersion!,
  );
  await expect(panel).toHaveAttribute('data-engine-version', engineVersion);

  await panel.locator('summary').click();
  await expect(panel).toHaveAttribute('open', '');
  await expect(panel.locator('[data-knowledge-line]')).toHaveText(
    new RegExp(`^${knowledgeVersion!.replace(/\./g, '\\.')}(\\s|$)`),
  );
  await expect(panel).toContainText(`explico ${engineVersion}`);
  await expect(
    panel.getByRole('link', { name: 'What changed' }),
  ).toHaveAttribute('href', /content\/CHANGELOG\.md$/);
});

const diagrams = [
  {
    path: '/derivatives/multiperiod-lattice-valuation/',
    id: 'backward-induction-flow',
    short: 'Backward-induction order',
    nodeCount: 5,
  },
  {
    path: '/bond-options/european-bond-options/',
    id: 'bond-option-valuation-flow',
    short: 'European bond-option valuation flow',
    nodeCount: 3,
  },
  {
    path: '/bond-options/issuer-default-knockout/',
    id: 'knockout-bond-option-flow',
    short: 'Issuer-default knockout valuation flow',
    nodeCount: 3,
  },
] as const;

for (const diagram of diagrams) {
  test(`${diagram.id} renders as a static, captioned diagram`, async ({
    page,
  }) => {
    await page.goto(diagram.path);

    const figure = page.locator(`figure#dia-${diagram.id}`);
    await expect(figure).toBeVisible();
    await expect(figure.locator('svg').first()).toBeVisible();
    await expect(figure.locator('.diagram-node')).toHaveCount(
      diagram.nodeCount,
    );
    await expect(figure.locator('.diagram-scroll')).toHaveAttribute(
      'tabindex',
      '0',
    );
    // The short caption opens the caption line, and the long caption (the
    // text alternative that used to sit in a collapsed description) follows.
    const caption = figure.locator('figcaption.float-caption');
    await expect(caption.locator('.float-caption__title')).toContainText(
      diagram.short,
    );
    await expect(caption.locator('.float-caption__text')).not.toBeEmpty();
  });
}

test('a wide diagram scrolls instead of shrinking its labels', async ({
  page,
}) => {
  await page.goto('/derivatives/multiperiod-lattice-valuation/');
  const scroller = page.locator('#dia-backward-induction-flow .diagram-scroll');
  const dimensions = await scroller.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
});
