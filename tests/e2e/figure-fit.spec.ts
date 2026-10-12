import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  checkFigureFit,
  lessonsWithFigures,
} from 'explico/reference/figure-fit';

// Rule V7: a figure's picture (its default slot) takes at most 80% of the
// screen height, so a reader sees it with its caption line. Only a laid-out
// page knows the height, so the check runs here, on every lesson with a
// `<Figure>`, at a laptop screen and at the phone screen the CDS spec uses.
// `pnpm validate:content` writes the manifest it reads.
const manifest = JSON.parse(readFileSync('build/manifest.json', 'utf8'));

const screens = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
] as const;

for (const path of lessonsWithFigures(manifest)) {
  for (const screen of screens) {
    test(`${path} figures fit on one ${screen.width}×${screen.height} screen (rule V7)`, async ({
      page,
    }) => {
      await page.setViewportSize(screen);
      await page.goto(path);
      const findings = await checkFigureFit(page);
      expect(findings.map((finding) => finding.message)).toEqual([]);
    });
  }
}
