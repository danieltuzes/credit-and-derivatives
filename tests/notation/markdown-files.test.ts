import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { markdownFilesBelow } from '../../src/notation/markdown-files.mjs';

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

describe('notation Markdown discovery', () => {
  it('finds nested Markdown files in deterministic path order', async () => {
    const root = await mkdtemp(join(tmpdir(), 'equations-notation-files-'));
    temporaryRoots.push(root);
    await Promise.all([
      mkdir(join(root, 'zeta'), { recursive: true }),
      mkdir(join(root, 'alpha', 'nested'), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(root, 'zeta', 'second.md'), ''),
      writeFile(join(root, 'alpha', 'nested', 'first.md'), ''),
      writeFile(join(root, 'root.md'), ''),
      writeFile(join(root, 'ignored.mdx'), ''),
      writeFile(join(root, 'alpha', 'ignored.json'), ''),
    ]);

    expect(
      markdownFilesBelow(root).map((path) => relative(root, path)),
    ).toEqual(['alpha/nested/first.md', 'root.md', 'zeta/second.md']);
  });
});
