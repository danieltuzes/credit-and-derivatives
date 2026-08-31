import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import matter from 'gray-matter';
import type {
  AssessmentDefinition,
  CompetencyDefinition,
  CurriculumCatalog,
  LessonDefinition,
  SourceDefinition,
  TrackDefinition,
} from '../src/curriculum/validation';

async function filesBelow(
  directory: string,
  extension: string,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? filesBelow(path, extension)
        : entry.name.endsWith(extension)
          ? [path]
          : [];
    }),
  );
  return nested.flat();
}

async function jsonEntries<T extends { readonly id: string }>(
  directory: string,
): Promise<T[]> {
  const paths = await filesBelow(directory, '.json');
  return Promise.all(
    paths.map(async (path) => {
      const entry = JSON.parse(await readFile(path, 'utf8')) as T;
      const filenameId = basename(path, '.json');
      if (entry.id !== filenameId) {
        throw new Error(
          `${path} declares id ${entry.id}; expected filename ${filenameId}.json`,
        );
      }
      return entry;
    }),
  );
}

async function lessonEntries(directory: string): Promise<LessonDefinition[]> {
  const paths = [
    ...(await filesBelow(directory, '.md')),
    ...(await filesBelow(directory, '.mdx')),
  ];

  const lessons: LessonDefinition[] = [];
  for (const path of paths) {
    const parsed = matter(await readFile(path, 'utf8'));
    const frontmatter = parsed.data as Record<string, unknown>;
    if (typeof frontmatter.lessonId !== 'string') continue;
    lessons.push({
      id: frontmatter.lessonId,
      status: frontmatter.editorialStatus as LessonDefinition['status'],
      requires: (frontmatter.requires as string[] | undefined) ?? [],
      teaches: (frontmatter.teaches as string[] | undefined) ?? [],
      assessments: (frontmatter.assessments as string[] | undefined) ?? [],
      sources: (frontmatter.sources as string[] | undefined) ?? [],
      assumptions: (frontmatter.assumptions as string[] | undefined) ?? [],
      body: parsed.content,
    });
  }
  return lessons;
}

export async function loadCurriculumCatalog(
  rootDirectory = process.cwd(),
): Promise<CurriculumCatalog> {
  const content = join(rootDirectory, 'src', 'content');
  const [competencies, lessons, assessments, sources, tracks] =
    await Promise.all([
      jsonEntries<CompetencyDefinition>(join(content, 'competencies')),
      lessonEntries(join(content, 'docs')),
      jsonEntries<AssessmentDefinition>(join(content, 'assessments')),
      jsonEntries<SourceDefinition>(join(content, 'sources')),
      jsonEntries<TrackDefinition>(join(content, 'tracks')),
    ]);

  return { competencies, lessons, assessments, sources, tracks };
}
