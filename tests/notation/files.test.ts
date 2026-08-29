import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadNotationRegistryInput } from '../../scripts/notation-files';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('notation content-file loader', () => {
  it('extracts prose references from Markdown and MDX-safe brace syntax', async () => {
    const root = await mkdtemp(join(tmpdir(), 'equations-notation-test-'));
    temporaryRoots.push(root);
    const docs = join(root, 'src', 'content', 'docs');
    await Promise.all([
      mkdir(docs, { recursive: true }),
      mkdir(join(root, 'src', 'content', 'notation'), { recursive: true }),
    ]);

    await Promise.all([
      writeFile(
        join(docs, 'markdown.md'),
        String.raw`---
lessonId: lesson.markdown
editorialStatus: draft
notation:
  uses:
    - rate
---

Use \term{rate} in ordinary Markdown.

Literal examples stay inert: ${'`'}\term{ignored-inline}${'`'}.

${'```'}tex
\term{ignored-fence}
\explain{ignored-fence}{x}
${'```'}
`,
      ),
      writeFile(
        join(docs, 'mdx.mdx'),
        String.raw`---
lessonId: lesson.mdx
editorialStatus: draft
notation:
  uses:
    - rate
---

Use \term\{rate\} in MDX and annotate $\explain{rate}{r}$.
`,
      ),
    ]);

    const input = await loadNotationRegistryInput(root);
    const referencesByLesson = Object.fromEntries(
      input.lessons.map((entry) => [
        entry.lessonId,
        entry.references.map(({ key, kind }) => ({ key, kind })),
      ]),
    );

    expect(referencesByLesson).toEqual({
      'lesson.markdown': [{ key: 'rate', kind: 'prose' }],
      'lesson.mdx': [
        { key: 'rate', kind: 'prose' },
        { key: 'rate', kind: 'math' },
      ],
    });
  });
});
