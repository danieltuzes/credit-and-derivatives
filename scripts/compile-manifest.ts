/**
 * Regenerate `build/manifest.json` and report its diagnostics.
 *
 * This is `pnpm validate:content`. It compiles the one manifest (the single
 * walk of the content tree), writes it deterministically, prints the
 * warnings, and exits non-zero if any blocking diagnostic is present.
 * `pnpm build` runs it first, so `astro build` and every page component read
 * a current manifest and never re-read the content tree.
 *
 * Every line printed here is also recorded, in Python's `logging` format, to
 * `build/logs/<timestamp>/{error,warning,info}.log` — see
 * `explico/compiler/logging`. The console text below is the human half and is
 * deliberately unchanged; `log.<level>()` returns its message so the printed
 * line and the recorded one cannot drift apart.
 */
import {
  compileManifest,
  MANIFEST_PATH,
  writeManifest,
} from 'explico/compiler/manifest';
import { createRunLog, diagnosticLine } from 'explico/compiler/logging';
import { syncResolutionReports } from 'explico/compiler/resolution-report';
import { writeRulesInEffect } from 'explico/rules/in-effect';
import { notationSourceLocatorGaps } from 'explico/compiler/collections';
import { consistencyCounts } from 'explico/reference/consistency';
import { curriculumErrors } from 'explico/curriculum/validation';
import { courseConfig } from '../content/course.config';

const log = createRunLog();

let manifest;
try {
  manifest = await compileManifest(courseConfig);
} catch (error) {
  // The console still gets the raw throw; the log keeps why the run ended.
  log.error(
    'manifest',
    `Manifest compilation failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  log.close();
  throw error;
}
writeManifest(manifest);

const {
  curriculum,
  notation,
  alignment,
  math,
  consistency,
  equations,
  tables,
  figures,
  diagrams,
  checks,
  examples,
  folds,
  knowledge,
  rawFloats,
  config,
  waivers,
} = manifest.diagnostics;

for (const warning of curriculum.filter(
  (issue) => issue.severity === 'warning',
)) {
  console.warn(
    log.warning('curriculum', `[${warning.kind}] ${warning.message}`),
  );
}
for (const warning of notation.filter((d) => d.severity === 'warning')) {
  console.warn(log.warning('notation', `[${warning.code}] ${warning.message}`));
}
for (const warning of alignment.filter((d) => d.severity === 'warning')) {
  console.warn(
    log.warning('alignment', `[${warning.code}] ${warning.message}`),
  );
}
// One loop per category, in the order the combined list used to print, so the
// console is unchanged while each record still carries its own logger name.
for (const [source, group] of [
  ['equations', equations],
  ['tables', tables],
  ['figures', figures],
  ['diagrams', diagrams],
  ['checks', checks],
  ['examples', examples],
  ['folds', folds],
  ['rawFloats', rawFloats],
] as const) {
  for (const warning of group.filter((d) => d.severity === 'warning')) {
    console.warn(log.warning(source, `[${warning.code}] ${warning.message}`));
  }
}

// `diagnosticLine` prefixes a code owned by a lettered rule with its ID
// (`[N9 prose-notation] file:line: …`), so the console names the rule page.
const formatMathIssue = (issue: (typeof math)[number]): string =>
  diagnosticLine(issue);
for (const issue of math.filter((item) => item.severity === 'warning')) {
  console.warn(log.warning('math', formatMathIssue(issue)));
}

for (const warning of knowledge) {
  console.warn(
    log.warning('knowledge', `[${warning.code}] ${warning.message}`),
  );
}
// The course settings themselves: a deprecated top-level block, a retired rule.
for (const warning of config) {
  console.warn(log.warning('config', `[${warning.code}] ${warning.message}`));
}
// Per-place waivers: a stale one is a warning; a malformed or invalid one
// fails below with the other errors.
for (const warning of waivers.filter((d) => d.severity === 'warning')) {
  console.warn(log.warning('waivers', diagnosticLine(warning)));
}

const locatorGaps = notationSourceLocatorGaps();
if (locatorGaps.bare > 0) {
  console.warn(
    log.warning(
      'consistency',
      `[notation-source-locator] ${locatorGaps.bare} of ${locatorGaps.total} notation source citations lack a non-empty locator.`,
    ),
  );
}

const consistencyWarnings = consistency.filter(
  (diagnostic) => diagnostic.severity === 'warning',
);
const consistencyByCode = consistencyCounts(consistencyWarnings);
const consistencyTotal = consistencyWarnings.length;
if (consistencyTotal > 0) {
  console.warn(
    log.warning(
      'consistency',
      `[consistency] ${consistencyTotal} Tier-3 finding(s): ` +
        Object.entries(consistencyByCode)
          .filter(([, count]) => count > 0)
          .map(([code, count]) => `${code}=${count}`)
          .join(', '),
    ),
  );
}

// Every Tier-3 finding individually, and every other severity-`info`
// diagnostic the engine produces — none of which the console has ever shown.
log.infoDiagnostics(manifest.diagnostics);
for (const diagnostic of consistencyWarnings) {
  log.info('consistency', `[${diagnostic.code}] ${diagnostic.message}`);
}

const reports = syncResolutionReports(manifest);
console.log(
  log.info(
    'manifest',
    `Resolution report: ${reports.written} file(s) under resolution/.`,
  ),
);
// The page an agent reads before drafting: every rule this course has on,
// by element, with codes and settings. Regenerated every run, never committed.
writeRulesInEffect(manifest);
console.log(
  log.info(
    'manifest',
    `Rules in effect: build/rules-in-effect.md (${manifest.rules.disabled.length} rule(s) off).`,
  ),
);

const failures: string[] = [];
const fail = (source: string, message: string): void => {
  failures.push(log.error(source, message));
};
for (const stalePath of reports.stale) {
  fail(
    'resolution-report',
    `[resolution-report] ${stalePath} is out of date — commit the regenerated resolution/ files`,
  );
}
for (const issue of curriculumErrors(curriculum)) {
  fail('curriculum', `[curriculum:${issue.kind}] ${issue.message}`);
}
for (const issue of notation.filter((d) => d.severity === 'error')) {
  fail('notation', `[notation:${issue.code}] ${issue.message}`);
}
for (const issue of alignment.filter((d) => d.severity === 'error')) {
  fail('alignment', `[alignment:${issue.code}] ${issue.message}`);
}
for (const issue of math.filter((item) => item.severity === 'error')) {
  fail('math', formatMathIssue(issue));
}
for (const issue of waivers.filter((d) => d.severity === 'error')) {
  fail('waivers', diagnosticLine(issue));
}
for (const [source, group] of [
  ['equations', equations],
  ['tables', tables],
  ['figures', figures],
  ['diagrams', diagrams],
  ['checks', checks],
  ['examples', examples],
  ['folds', folds],
  ['rawFloats', rawFloats],
] as const) {
  for (const issue of group.filter((d) => d.severity === 'error')) {
    fail(source, `[${issue.code}] ${issue.message}`);
  }
}

if (failures.length > 0) {
  const summary = log.close();
  console.error(
    `Run log: ${summary.relativeDirectory} ` +
      `(${summary.counts.ERROR} error(s), ${summary.counts.WARNING} warning(s)).`,
  );
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
  log.info(
    'manifest',
    `Manifest written to ${relPath} (schema v${manifest.schemaVersion}, ` +
      `knowledge v${manifest.about.knowledge.version}): ` +
      `${manifest.competencies.length} competencies, ${manifest.lessons.length} lessons, ` +
      `${itemCount} lesson assessment links, ${manifest.notation.definitions.length} notation definitions, ` +
      `${manifest.sources.length} sources, ${manifest.tracks.length} track(s). ` +
      `Content fingerprint ${manifest.hashes.contentTree}.`,
  ),
);

const summary = log.close();
console.log(
  `Run log: ${summary.relativeDirectory} ` +
    `(${summary.counts.ERROR} error(s), ${summary.counts.WARNING} warning(s), ${summary.counts.INFO} info).`,
);
