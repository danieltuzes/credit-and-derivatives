import { expect, test, type Locator } from '@playwright/test';

const lessonPath = '/foundations/cash-flow-timelines/';
const navigationPreference = 'credit-playground:layout:navigation-hidden';
const contentsPreference = 'credit-playground:layout:contents-hidden';

async function expectVisibleIconCentered(toggle: Locator) {
  const toggleBox = await toggle.boundingBox();
  const iconBox = await toggle
    .locator('.layout-edge-icon:visible')
    .boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(iconBox!.x + iconBox!.width / 2).toBeCloseTo(
    toggleBox!.x + toggleBox!.width / 2,
    5,
  );
  expect(iconBox!.y + iconBox!.height / 2).toBeCloseTo(
    toggleBox!.y + toggleBox!.height / 2,
    5,
  );
}

test('desktop edge controls collapse both sidebars and persist narrow rails', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(lessonPath);

  const navigationToggle = page.locator('[data-layout-toggle="navigation"]');
  const contentsToggle = page.locator('[data-layout-toggle="contents"]');
  const navigationShell = page.locator('.sidebar-pane');
  const contentsShell = page.locator('.right-sidebar-container');

  await expect(navigationToggle).toBeVisible();
  await expect(navigationToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigationToggle).toHaveAttribute(
    'aria-controls',
    'starlight__navigation-content',
  );
  await expect(navigationToggle).toHaveAttribute(
    'aria-label',
    'Hide navigation',
  );
  await expect(contentsToggle).toBeVisible();
  await expect(contentsToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(contentsToggle).toHaveAttribute(
    'aria-controls',
    'starlight__page-sidebar-content',
  );
  await expect(contentsToggle).toHaveAttribute(
    'aria-label',
    'Hide page contents',
  );

  const navigationBox = await navigationShell.boundingBox();
  const navigationToggleBox = await navigationToggle.boundingBox();
  const contentsBox = await contentsShell.boundingBox();
  const contentsToggleBox = await contentsToggle.boundingBox();
  expect(navigationBox).not.toBeNull();
  expect(navigationToggleBox).not.toBeNull();
  expect(contentsBox).not.toBeNull();
  expect(contentsToggleBox).not.toBeNull();
  expect(navigationToggleBox!.x).toBeGreaterThan(
    navigationBox!.x + navigationBox!.width - 45,
  );
  expect(contentsToggleBox!.x).toBeLessThan(contentsBox!.x + 45);
  await expectVisibleIconCentered(navigationToggle);
  await expectVisibleIconCentered(contentsToggle);

  await navigationToggle.click();
  await expect(navigationToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigationToggle).toHaveAttribute(
    'aria-label',
    'Show navigation',
  );
  await expect(page.locator('.layout-navigation-content')).toBeHidden();
  await expect
    .poll(async () => (await navigationShell.boundingBox())?.width)
    .toBeLessThan(60);

  await contentsToggle.click();
  await expect(contentsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(contentsToggle).toHaveAttribute(
    'aria-label',
    'Show page contents',
  );
  await expect(page.locator('.layout-page-sidebar-content')).toBeHidden();
  await expect
    .poll(async () => (await contentsShell.boundingBox())?.width)
    .toBeLessThan(60);
  const collapsedNavigationToggleBox = await navigationToggle.boundingBox();
  const collapsedContentsToggleBox = await contentsToggle.boundingBox();
  expect(collapsedNavigationToggleBox?.y).toBe(navigationToggleBox?.y);
  expect(collapsedContentsToggleBox?.y).toBe(contentsToggleBox?.y);
  await expectVisibleIconCentered(navigationToggle);
  await expectVisibleIconCentered(contentsToggle);

  await expect
    .poll(() =>
      page.evaluate(
        ([navigationKey, contentsKey]) => [
          localStorage.getItem(navigationKey),
          localStorage.getItem(contentsKey),
        ],
        [navigationPreference, contentsPreference],
      ),
    )
    .toEqual(['true', 'true']);

  await page.reload();
  await expect(navigationToggle).toBeVisible();
  await expect(navigationToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(contentsToggle).toBeVisible();
  await expect(contentsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect
    .poll(async () => (await navigationShell.boundingBox())?.width)
    .toBeLessThan(60);
  await expect
    .poll(async () => (await contentsShell.boundingBox())?.width)
    .toBeLessThan(60);

  const mainPane = page.locator('.main-pane');
  const rightPanel = page.locator('.right-sidebar');
  const mainBeforePreview = await mainPane.boundingBox();
  const contentsToggleBeforePreview = await contentsToggle.boundingBox();
  await rightPanel.hover({ position: { x: 5, y: 300 } });
  await expect
    .poll(async () => (await rightPanel.boundingBox())?.width)
    .toBeGreaterThan(250);
  await expect(page.locator('.layout-page-sidebar-content')).toBeVisible();
  const mainDuringPreview = await mainPane.boundingBox();
  const contentsToggleDuringPreview = await contentsToggle.boundingBox();
  expect(mainDuringPreview).toEqual(mainBeforePreview);
  expect(contentsToggleDuringPreview).toEqual(contentsToggleBeforePreview);
  expect(
    await rightPanel.evaluate((element) => getComputedStyle(element).zIndex),
  ).not.toBe('auto');
  expect(
    await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      contentsPreference,
    ),
  ).toBe('true');
});

for (const viewportWidth of [1152, 1440, 1920, 2560]) {
  for (const navigationHidden of [false, true]) {
    test(`right preview matches the open panel at ${viewportWidth}px with navigation ${navigationHidden ? 'collapsed' : 'open'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewportWidth, height: 900 });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.addInitScript(
        ([navigationKey, contentsKey, hideNavigation]) => {
          localStorage.setItem(navigationKey, String(hideNavigation));
          localStorage.setItem(contentsKey, 'false');
        },
        [navigationPreference, contentsPreference, navigationHidden] as const,
      );
      await page.goto(lessonPath);

      const contentsToggle = page.locator('[data-layout-toggle="contents"]');
      const contentsShell = page.locator('.right-sidebar-container');
      const rightPanel = page.locator('.right-sidebar');
      const tocContent = page.locator('.right-sidebar-panel > .sl-container');
      const mainPane = page.locator('.main-pane');

      const openShellBox = await contentsShell.boundingBox();
      const openTocBox = await tocContent.boundingBox();
      const openBackground = await rightPanel.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      const pageBackground = await page
        .locator('body')
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(openShellBox).not.toBeNull();
      expect(openTocBox).not.toBeNull();
      expect(openBackground).toBe(pageBackground);

      await contentsToggle.click();
      await expect
        .poll(async () => (await contentsShell.boundingBox())?.width)
        .toBeLessThan(60);
      const mainBeforePreview = await mainPane.boundingBox();
      const toggleBeforePreview = await contentsToggle.boundingBox();

      await rightPanel.hover({ position: { x: 5, y: 300 } });
      await expect
        .poll(async () => (await rightPanel.boundingBox())?.width)
        .toBeCloseTo(openShellBox!.width, 5);
      await expect(page.locator('.layout-page-sidebar-content')).toBeVisible();

      const previewPanelBox = await rightPanel.boundingBox();
      const previewTocBox = await tocContent.boundingBox();
      const mainDuringPreview = await mainPane.boundingBox();
      const toggleDuringPreview = await contentsToggle.boundingBox();
      const previewBackground = await rightPanel.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      expect(previewPanelBox).not.toBeNull();
      expect(previewTocBox).not.toBeNull();
      expect(previewPanelBox!.x).toBeCloseTo(openShellBox!.x, 5);
      expect(previewPanelBox!.width).toBeCloseTo(openShellBox!.width, 5);
      expect(previewTocBox!.x).toBeCloseTo(openTocBox!.x, 5);
      expect(previewTocBox!.width).toBeCloseTo(openTocBox!.width, 5);
      expect(previewBackground).toBe(openBackground);
      expect(mainDuringPreview).toEqual(mainBeforePreview);
      expect(toggleDuringPreview).toEqual(toggleBeforePreview);
      expect(
        await page.evaluate(
          (storageKey) => localStorage.getItem(storageKey),
          contentsPreference,
        ),
      ).toBe('true');
    });
  }
}

test('the collapsed navigation previews without persisting and restores by keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(lessonPath);

  const navigationToggle = page.locator('[data-layout-toggle="navigation"]');
  const navigationShell = page.locator('.sidebar-pane');
  const navigationContent = page.locator('.layout-navigation-content');
  await navigationToggle.click();
  await expect
    .poll(async () => (await navigationShell.boundingBox())?.width)
    .toBeLessThan(60);

  const navigationToggleBeforePreview = await navigationToggle.boundingBox();
  await navigationShell.hover({ position: { x: 5, y: 300 } });
  await expect
    .poll(async () => (await navigationShell.boundingBox())?.width)
    .toBeGreaterThan(250);
  await expect(navigationContent).toBeVisible();
  await expect(navigationToggle).toHaveAttribute('aria-expanded', 'false');
  const navigationToggleDuringPreview = await navigationToggle.boundingBox();
  expect(navigationToggleDuringPreview).toEqual(navigationToggleBeforePreview);
  expect(
    await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      navigationPreference,
    ),
  ).toBe('true');

  await page.mouse.move(800, 700);
  await expect
    .poll(async () => (await navigationShell.boundingBox())?.width)
    .toBeLessThan(60);

  await navigationToggle.focus();
  await expect(navigationToggle).toBeFocused();
  await expect
    .poll(async () => (await navigationShell.boundingBox())?.width)
    .toBeLessThan(60);
  await expect(navigationContent).toBeHidden();

  await page.keyboard.press('Enter');
  await expect(navigationToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigationToggle).toHaveAttribute(
    'aria-label',
    'Hide navigation',
  );
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-navigation-hidden',
    '',
  );
  expect(
    await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      navigationPreference,
    ),
  ).toBe('false');
});

test('edge controls stay out of the accessibility tree without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(lessonPath);

  const controls = page.locator('[data-layout-toggle]');
  await expect(controls).toHaveCount(2);
  for (const control of await controls.all()) {
    await expect(control).toHaveAttribute('hidden', '');
    await expect(control).toBeHidden();
  }
  await expect(
    page.getByRole('button', { name: /navigation|page contents/ }),
  ).toHaveCount(0);
  await expect(page.locator('.layout-navigation-content')).toBeVisible();
  await expect(page.locator('.layout-page-sidebar-content')).toBeVisible();

  await context.close();
});

test('stored desktop preferences do not alter Starlight mobile navigation or contents', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ([navigationKey, contentsKey]) => {
      localStorage.setItem(navigationKey, 'true');
      localStorage.setItem(contentsKey, 'true');
    },
    [navigationPreference, contentsPreference],
  );
  await page.goto(lessonPath);

  await expect(page.locator('[data-layout-toggle="navigation"]')).toBeHidden();
  await expect(page.locator('[data-layout-toggle="contents"]')).toBeHidden();

  const mobileMenuToggle = page.locator('starlight-menu-button > button');
  const mobileMenu = page.locator('#starlight__sidebar');
  await expect(mobileMenuToggle).toBeVisible();
  await expect(mobileMenu).toBeHidden();
  await mobileMenuToggle.click();
  await expect(page.locator('starlight-menu-button')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(mobileMenu).toBeVisible();
  await mobileMenuToggle.click();
  await expect(page.locator('starlight-menu-button')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(mobileMenu).toBeHidden();

  const mobileContents = page.locator('mobile-starlight-toc');
  await expect(mobileContents.locator('summary')).toBeVisible();
  await mobileContents.locator('summary').click();
  await expect(mobileContents.locator('details')).toHaveAttribute('open', '');
});
