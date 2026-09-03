/**
 * Regenerate `.generated/manifest.json` and report its diagnostics.
 *
 * This is `pnpm validate:content`. It compiles the one manifest (the single
 * walk of the content tree), writes it deterministically, prints the warnings,
 * and exits non-zero if any blocking diagnostic is present. `pnpm build` runs
 * it first, so `astro build` and every page component read a current manifest
 * and never re-read the content tree.
 */
import {
  compileManifest,
  MANIFEST_PATH,
  writeManifest,
} from '../src/content/manifest';
import { notationSourceLocatorGaps } from '../src/content/collections';
import { curriculumErrors } from '../src/curriculum/validation';

const manifest = await compileManifest();
writeManifest(manifest);

const { curriculum, notation, alignment, math } = manifest.diagnostics;

for (const warning of curriculum.filter(
  (issue) => issue.severity === 'warning',
)) {
  console.warn(`[${warning.kind}] ${warning.message}`);
}
for (const warning of notation.filter((d) => d.severity === 'warning')) {
  console.warn(`[${warning.code}] ${warning.message}`);
}
for (const warning of alignment.filter((d) => d.severity === 'warning')) {
  console.warn(`[${warning.code}] ${warning.message}`);
}

const formatMathIssue = (issue: (typeof math)[number]): string => {
  const at = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `[math-complete] ${at}: ${issue.message}`;
};
for (const issue of math.filter((item) => item.severity === 'warning')) {
  console.warn(formatMathIssue(issue));
}

const locatorGaps = notationSourceLocatorGaps();
if (locatorGaps.bare > 0) {
  console.warn(
    `[notation-source-locator] ${locatorGaps.bare} of ${locatorGaps.total} notation source citations are bare ids without a { id, locator } (pending D6/g).`,
  );
}

const failures: string[] = [];
for (const issue of curriculumErrors(curriculum)) {
  failures.push(`[curriculum:${issue.kind}] ${issue.message}`);
}
for (const issue of notation.filter((d) => d.severity === 'error')) {
  failures.push(`[notation:${issue.code}] ${issue.message}`);
}
for (const issue of alignment.filter((d) => d.severity === 'error')) {
  failures.push(`[alignment:${issue.code}] ${issue.message}`);
}
for (const issue of math.filter((item) => item.severity === 'error')) {
  failures.push(formatMathIssue(issue));
}

if (failures.length > 0) {
  throw new Error(
    `Content manifest has ${failures.length} blocking diagnostic(s):\n${failures
      .map((line) => `- ${line}`)
      .join('\n')}`,
  );
}

const itemCount = manifest.lessons.reduce(
  (count, lesson) => count + lesson.assessments.length,
  0,
);
const relPath = MANIFEST_PATH.replace(`${process.cwd()}/`, '');
console.log(
  `Manifest written to ${relPath} (schema v${manifest.schemaVersion}): ` +
    `${manifest.competencies.length} competencies, ${manifest.lessons.length} lessons, ` +
    `${itemCount} lesson assessment links, ${manifest.notation.definitions.length} notation definitions, ` +
    `${manifest.sources.length} sources, ${manifest.tracks.length} track(s). ` +
    `Content fingerprint ${manifest.hashes.contentTree}.`,
);
