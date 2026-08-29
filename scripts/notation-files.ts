import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import matter from 'gray-matter';
import type {
  EditorialStatus,
  LocalNotationDefinitionInput,
  NotationAlignment,
  NotationLessonInput,
  NotationReferenceInput,
  NotationRegistryInput,
  SharedNotationDefinitionInput,
  SourceSpan,
} from '../src/notation/types';

async function filesBelow(
  directory: string,
  extensions: readonly string[],
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? filesBelow(path, extensions)
        : extensions.some((extension) => entry.name.endsWith(extension))
          ? [path]
          : [];
    }),
  );
  return nested.flat().sort();
}

function source(file: string, text?: string, index?: number): SourceSpan {
  if (text === undefined || index === undefined) return { file };
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return {
    file,
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : string(value, label);
}

function strings(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${label} must be an array of strings`);
  }
  return [...value] as string[];
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be a boolean`);
  }
  return value;
}

function status(value: unknown, label: string): EditorialStatus {
  if (value !== 'draft' && value !== 'in-review' && value !== 'reviewed') {
    throw new TypeError(`${label} must be draft, in-review, or reviewed`);
  }
  return value;
}

function alignment(value: unknown, label: string): NotationAlignment {
  const data = record(value, label);
  if (data.kind === 'general') {
    return {
      kind: 'general',
      rationale: string(data.rationale, `${label}.rationale`),
    };
  }
  if (data.kind === 'competency') {
    return {
      kind: 'competency',
      introducedByCompetency: string(
        data.introducedByCompetency,
        `${label}.introducedByCompetency`,
      ),
      introducedInLesson: string(
        data.introducedInLesson,
        `${label}.introducedInLesson`,
      ),
    };
  }
  throw new TypeError(`${label}.kind must be competency or general`);
}

function extractReferences(
  text: string,
  file: string,
  kind: NotationReferenceInput['kind'] | undefined,
): NotationReferenceInput[] {
  const references: NotationReferenceInput[] = [];
  const searchable = maskMarkdownLiterals(text);
  const patterns: readonly [RegExp, NotationReferenceInput['kind']][] = [
    // MDX reserves braces for JavaScript expressions, so lesson source uses
    // `\term\{key\}`. The Markdown parser removes those brace escapes before
    // the remark adapter runs; the file validator reads the source directly.
    [/\\term\\\{([^{}]+)\\\}/g, kind ?? 'prose'],
    [/\\term\{([^{}]+)\}/g, kind ?? 'prose'],
    [/\\explain\{([^{}]+)\}/g, kind ?? 'math'],
  ];

  for (const [pattern, referenceKind] of patterns) {
    for (const match of searchable.matchAll(pattern)) {
      references.push({
        key: (match[1] ?? '').trim(),
        kind: referenceKind,
        source: source(file, text, match.index),
      });
    }
  }

  return references.sort(
    (left, right) =>
      (left.source.line ?? 0) - (right.source.line ?? 0) ||
      (left.source.column ?? 0) - (right.source.column ?? 0) ||
      left.key.localeCompare(right.key),
  );
}

function maskMarkdownLiterals(text: string): string {
  const mask = (value: string) => value.replace(/[^\n]/g, ' ');
  return text
    .replace(
      /(^|\n)[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]{0,3}\2[^\n]*(?=\n|$)|$)/g,
      mask,
    )
    .replace(/^(?: {4}|\t).*$/gm, mask)
    .replace(/(`+)(?!`)([^\n]*?)\1/g, mask);
}

function localDefinition(
  raw: unknown,
  file: string,
  index: number,
): LocalNotationDefinitionInput {
  const data = record(raw, `${file} notation.local[${index}]`);
  const label = `${file} notation.local[${index}]`;
  const summary = string(data.summary, `${label}.summary`);
  const details = optionalString(data.details, `${label}.details`);
  const formula = optionalString(data.formula, `${label}.formula`);
  const definitionText = [summary, details, formula]
    .filter((value): value is string => value !== undefined)
    .join('\n');

  return {
    key: string(data.key, `${label}.key`),
    notation: string(data.notation, `${label}.notation`),
    title: string(data.title, `${label}.title`),
    summary,
    sources: strings(data.sources, `${label}.sources`),
    seeAlso: strings(data.seeAlso, `${label}.seeAlso`),
    alignment: alignment(data.alignment, `${label}.alignment`),
    references: extractReferences(definitionText, file, 'definition'),
    source: { file },
    ...(details === undefined ? {} : { details }),
    ...(formula === undefined ? {} : { formula }),
    ...(optionalString(data.units, `${label}.units`) === undefined
      ? {}
      : { units: optionalString(data.units, `${label}.units`) }),
  };
}

async function sharedEntries(
  contentDirectory: string,
  rootDirectory: string,
): Promise<SharedNotationDefinitionInput[]> {
  const directory = join(contentDirectory, 'notation');
  const paths = await filesBelow(directory, ['.md']);
  return Promise.all(
    paths.map(async (path) => {
      const file = relative(rootDirectory, path);
      const parsed = matter(await readFile(path, 'utf8'));
      const data = parsed.data as Record<string, unknown>;
      const key = string(data.key, `${file} key`);
      const filenameKey = basename(path, '.md');
      if (key !== filenameKey) {
        throw new Error(`${file} declares key ${key}; expected ${filenameKey}`);
      }
      const units = optionalString(data.units, `${file} units`);
      const perspective = optionalString(
        data.perspective,
        `${file} perspective`,
      );
      return {
        key,
        notation: string(data.notation, `${file} notation`),
        title: string(data.title, `${file} title`),
        aliases: strings(data.aliases, `${file} aliases`),
        domain: string(data.domain, `${file} domain`),
        sources: strings(data.sources, `${file} sources`),
        seeAlso: strings(data.seeAlso, `${file} seeAlso`),
        alignment: alignment(data.alignment, `${file} alignment`),
        status: status(data.editorialStatus, `${file} editorialStatus`),
        aiAssisted: boolean(data.aiAssisted, `${file} aiAssisted`),
        body: parsed.content,
        references: extractReferences(parsed.content, file, undefined),
        source: { file },
        ...(units === undefined ? {} : { units }),
        ...(perspective === undefined ? {} : { perspective }),
      };
    }),
  );
}

async function lessonEntries(
  contentDirectory: string,
  rootDirectory: string,
): Promise<NotationLessonInput[]> {
  const directory = join(contentDirectory, 'docs');
  const paths = await filesBelow(directory, ['.md', '.mdx']);
  const lessons: NotationLessonInput[] = [];

  for (const path of paths) {
    const file = relative(rootDirectory, path);
    const parsed = matter(await readFile(path, 'utf8'));
    const data = parsed.data as Record<string, unknown>;
    if (typeof data.lessonId !== 'string') continue;
    const notation = record(data.notation ?? {}, `${file} notation`);
    const local = Array.isArray(notation.local) ? notation.local : [];
    lessons.push({
      lessonId: data.lessonId,
      status: status(data.editorialStatus, `${file} editorialStatus`),
      uses: strings(notation.uses, `${file} notation.uses`),
      localDefinitions: local.map((entry, index) =>
        localDefinition(entry, file, index),
      ),
      references: extractReferences(parsed.content, file, undefined),
      body: parsed.content,
      source: { file },
    });
  }

  return lessons;
}

export async function loadNotationRegistryInput(
  rootDirectory = process.cwd(),
): Promise<NotationRegistryInput> {
  const contentDirectory = join(rootDirectory, 'src', 'content');
  const [sharedDefinitions, lessons] = await Promise.all([
    sharedEntries(contentDirectory, rootDirectory),
    lessonEntries(contentDirectory, rootDirectory),
  ]);
  return { sharedDefinitions, lessons };
}
