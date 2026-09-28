import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The parts and their chapters come from the compiled manifest, the same
// source `<PartOverview>` and `<CourseContents>` read, so a new chapter or a
// renamed part needs no edit here.
interface Manifest {
  parts: { dir: string; label: string; ordinal: number; lessons: string[] }[];
  lessons: { id: string; slug: string; title: string }[];
}
const manifest: Manifest = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../build/manifest.json', import.meta.url)),
    'utf8',
  ),
);
const lessonById = new Map(
  manifest.lessons.map((lesson) => [lesson.id, lesson]),
);

for (const part of manifest.parts) {
  test(`the ${part.label} overview page states its bridge and scope and lists its chapters`, async ({
    page,
  }) => {
    await page.goto(`/${part.dir}/`);
    await expect(page.locator('main h1')).toHaveText(part.label);

    // Rule S2: every part after the first opens with a bridge paragraph.
    await expect(page.locator('.part-bridge')).toHaveCount(
      part.ordinal === 1 ? 0 : 1,
    );
    await expect(page.locator('.part-scope')).toHaveCount(1);

    const chapters = page.locator('.part-overview .part-chapters > li > a');
    await expect(chapters).toHaveCount(part.lessons.length);
    for (const [index, id] of part.lessons.entries()) {
      const lesson = lessonById.get(id)!;
      await expect(chapters.nth(index)).toHaveText(lesson.title);
      await expect(chapters.nth(index)).toHaveAttribute(
        'href',
        `/${lesson.slug}/`,
      );
    }
  });
}

test('a chapter names its part above the title, linked to the overview page', async ({
  page,
}) => {
  await page.goto('/cds/premium-protection-legs-and-par-spread/');
  const partLink = page
    .locator('main')
    .getByRole('link', { name: 'CDS', exact: true })
    .first();
  await expect(partLink).toHaveAttribute('href', '/cds/');
});

test('the homepage lists every part and chapter in reading order', async ({
  page,
}) => {
  await page.goto('/');
  const contents = page.locator('.course-contents');
  const parts = contents.locator('.course-part');
  await expect(parts).toHaveCount(manifest.parts.length);
  for (const [index, part] of manifest.parts.entries()) {
    const section = parts.nth(index);
    await expect(
      section.getByRole('link', { name: part.label, exact: true }),
    ).toHaveAttribute('href', `/${part.dir}/`);
    const chapterLinks = section.locator('li > a');
    await expect(chapterLinks).toHaveText(
      part.lessons.map((id) => lessonById.get(id)!.title),
    );
  }
});

test('overview and contents links use the course accent, not the default link blue', async ({
  page,
}) => {
  for (const path of ['/', '/credit/']) {
    await page.goto(path);
    const link = page.locator('.course-contents a, .part-overview a').first();
    const [color, accent] = await link.evaluate((element) => [
      getComputedStyle(element).color,
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sl-color-text-accent')
        .trim(),
    ]);
    expect(color, path).not.toBe('rgb(0, 0, 238)');
    const probe = await page.evaluate((value) => {
      const span = document.createElement('span');
      span.style.color = value;
      document.body.append(span);
      const resolved = getComputedStyle(span).color;
      span.remove();
      return resolved;
    }, accent);
    expect(color, path).toBe(probe);
  }
});

test('part overview pages and the homepage have no detectable accessibility violations', async ({
  page,
}) => {
  for (const path of ['/', '/foundations/', '/cds/']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).include('main').analyze();
    expect(results.violations, path).toEqual([]);
  }
});
