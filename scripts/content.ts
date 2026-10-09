/**
 * `pnpm content <command>` — the AI-authoring surface.
 *
 * A read-only router over the one compiler manifest. The logic lives in
 * `explico/compiler/cli`; this file only parses argv, prints the result
 * (`--json` = data only, no stack traces), and sets the exit code.
 *
 *   content status                       counts, diagnostics, orphans
 *   content diagnostics [severity] [--json]
 *                                        diagnostics at info, warning, or error+
 *   content warnings [--json]            warnings only, with source locations
 *   content context <lesson> [--json]    that lesson + only what a drafter needs
 *   content check <lesson> [--changed] [--json]
 *                                        schema + refs + renderability (MDX →
 *                                        remark → KaTeX → HTML)
 *   content rules [--element <e>[,<e>]] [--enforcement script|partial|guide|locked] [--json]
 *                                        the rules this course has on, by
 *                                        element — read before drafting
 *   content new lesson <id>              non-overwriting draft scaffold
 *   content new term <key>               non-overwriting draft scaffold
 *
 * Everything except `new` is read-only.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { compileManifest } from 'explico/compiler/manifest';
import {
  ContentCliError,
  contentCheck,
  contentContext,
  contentDiagnostics,
  contentRules,
  contentStatus,
  contentWarnings,
  parseRulesFilter,
  scaffoldLesson,
  scaffoldTerm,
  type Scaffold,
} from 'explico/compiler/cli';
import { courseConfig } from '../content/course.config';

const USAGE = `Usage:
  pnpm content status
  pnpm content diagnostics [info|warning|error] [--json]
  pnpm content warnings [--json]
  pnpm content context <lesson> [--json]
  pnpm content check <lesson> [--changed] [--json]
  pnpm content rules [--element <e>[,<e>]] [--enforcement script|partial|guide|locked] [--json]
  pnpm content new lesson <id>
  pnpm content new term <key>`;

interface ParsedArgs {
  readonly command: string;
  readonly positionals: readonly string[];
  readonly json: boolean;
  readonly changed: boolean;
  /** `--element a,b` — a value-taking flag; also `--element=a,b`. */
  readonly element?: string;
  /** `--enforcement script` — a value-taking flag; also `--enforcement=script`. */
  readonly enforcement?: string;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const positionals: string[] = [];
  let json = false;
  let changed = false;
  let element: string | undefined;
  let enforcement: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const valued = /^--(element|enforcement)(?:=(.*))?$/.exec(arg);
    if (arg === '--json') json = true;
    else if (arg === '--changed') changed = true;
    else if (valued) {
      const value = valued[2] ?? argv[(i += 1)] ?? '';
      if (valued[1] === 'element') element = value;
      else enforcement = value;
    } else positionals.push(arg);
  }
  return {
    command: positionals[0] ?? '',
    positionals: positionals.slice(1),
    json,
    changed,
    ...(element === undefined ? {} : { element }),
    ...(enforcement === undefined ? {} : { enforcement }),
  };
}

function emitJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(code: string, message: string, json: boolean): never {
  if (json) emitJson({ ok: false, error: { code, message } });
  else process.stderr.write(`Error [${code}]: ${message}\n`);
  process.exit(1);
}

function writeScaffold(scaffold: Scaffold): string[] {
  const written: string[] = [];
  for (const file of [
    { path: scaffold.path, contents: scaffold.contents },
    ...scaffold.companions,
  ]) {
    const absolute = join(process.cwd(), file.path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.contents, { flag: 'wx' });
    written.push(file.path);
  }
  return written;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (
    args.command === '' ||
    args.command === 'help' ||
    args.command === '--help'
  ) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  if (args.command === 'new') {
    const [kind, id] = args.positionals;
    if (kind !== 'lesson' && kind !== 'term') {
      fail(
        'unknown-kind',
        `content new expects "lesson" or "term".`,
        args.json,
      );
    }
    if (!id) {
      fail('usage', `content new ${kind} needs an id.`, args.json);
    }
    const scaffold = kind === 'lesson' ? scaffoldLesson(id) : scaffoldTerm(id);
    const written = writeScaffold(scaffold);
    if (args.json) emitJson({ ok: true, created: written });
    else
      process.stdout.write(
        `Created:\n${written.map((p) => `  ${p}`).join('\n')}\n`,
      );
    return;
  }

  const manifest = await compileManifest(courseConfig);

  switch (args.command) {
    case 'status': {
      const report = contentStatus(manifest);
      if (args.json) emitJson(report);
      else {
        const c = report.counts;
        process.stdout.write(
          `Knowledge version ${report.knowledgeVersion}\n` +
            `Lessons ${c.lessons} · ` +
            `competencies ${c.competencies} · assessments ${c.assessments} · ` +
            `sources ${c.sources} · tracks ${c.tracks} · ` +
            `notation ${c.notationDefinitions} · ` +
            `keyed equations ${c.keyedEquations} · tables ${c.keyedTables} · ` +
            `figures ${c.keyedFigures} · diagrams ${c.keyedDiagrams} · ` +
            `example sets ${c.keyedExamples}\n` +
            `Diagnostics: ${report.diagnostics.errors} error(s), ${report.diagnostics.warnings} warning(s), ${report.diagnostics.infos} info\n` +
            `Orphans: ${report.orphans.length}\n`,
        );
      }
      return;
    }

    case 'rules': {
      const filter = parseRulesFilter({
        ...(args.element === undefined ? {} : { element: args.element }),
        ...(args.enforcement === undefined
          ? {}
          : { enforcement: args.enforcement }),
      });
      const report = contentRules(manifest, filter);
      if (args.json)
        emitJson({
          filter: report.filter,
          count: report.count,
          rules: report.rules,
        });
      else process.stdout.write(report.markdown);
      return;
    }

    case 'warnings': {
      const report = contentWarnings(manifest);
      if (args.json) emitJson(report);
      else {
        for (const warning of report.warnings) {
          const location = warning.file
            ? `${warning.file}:${warning.line ?? 1}:${warning.column ?? 1}: `
            : '';
          process.stdout.write(
            `${location}warning ${warning.code}: ${warning.message}\n`,
          );
        }
        process.stdout.write(`${report.count} warning(s)\n`);
      }
      return;
    }

    case 'diagnostics': {
      const [requested = 'info', ...extra] = args.positionals;
      if (
        extra.length > 0 ||
        (requested !== 'info' &&
          requested !== 'warning' &&
          requested !== 'error')
      ) {
        fail(
          'usage',
          'content diagnostics expects one of: info, warning, error.',
          args.json,
        );
      }
      const report = contentDiagnostics(manifest, requested);
      if (args.json) emitJson(report);
      else {
        for (const diagnostic of report.diagnostics) {
          const location = diagnostic.file
            ? `${diagnostic.file}:${diagnostic.line ?? 1}:${diagnostic.column ?? 1}: `
            : '';
          process.stdout.write(
            `${location}${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}\n`,
          );
        }
        process.stdout.write(
          `${report.count} diagnostic(s) at ${report.minimumSeverity} or higher\n`,
        );
      }
      return;
    }

    case 'context': {
      const [lesson] = args.positionals;
      if (!lesson)
        fail('usage', 'content context needs a <lesson> id.', args.json);
      const report = contentContext(manifest, lesson);
      if (args.json) emitJson(report);
      else {
        const t = report.tokens;
        process.stdout.write(
          `${report.lesson.id} — ${report.lesson.title}\n` +
            `teaches: ${report.lesson.teaches.join(', ') || '(none)'}\n` +
            `requires: ${report.lesson.requires.join(', ') || '(none)'}\n` +
            `notation: ${report.notation.map((n) => n.key).join(', ') || '(none)'}\n` +
            `sources: ${report.sources.map((s) => s.id).join(', ') || '(none)'}\n` +
            `diagnostics: ${report.diagnostics.length}\n` +
            `tokens: context ${t.context} vs doc set ${t.docSet} + corpus ${t.corpus} ` +
            `(${(t.ratio * 100).toFixed(2)}% of the baseline)\n`,
        );
      }
      return;
    }

    case 'check': {
      const report = await contentCheck(manifest, {
        lessons: args.positionals,
        changed: args.changed,
      });
      if (args.json) emitJson(report);
      else {
        for (const entry of report.lessons) {
          process.stdout.write(
            `${entry.ok ? 'ok  ' : 'FAIL'} ${entry.lesson}` +
              `${entry.rendered ? '' : ' (render failed)'}\n`,
          );
          for (const diagnostic of entry.diagnostics) {
            process.stdout.write(
              `     [${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}\n`,
            );
          }
        }
        if (report.lessons.length === 0) {
          process.stdout.write('No changed lessons.\n');
        }
      }
      if (!report.ok) process.exit(1);
      return;
    }

    default:
      fail(
        'unknown-command',
        `Unknown command "${args.command}".\n${USAGE}`,
        args.json,
      );
  }
}

main().catch((error) => {
  const json = process.argv.includes('--json');
  if (error instanceof ContentCliError) fail(error.code, error.message, json);
  const message = error instanceof Error ? error.message : String(error);
  fail('internal', message, json);
});
