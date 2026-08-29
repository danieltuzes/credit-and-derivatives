import { describe, expect, it } from 'vitest';
import remarkNotation from '../../src/notation/remark-notation.mjs';

interface TestNode {
  type: string;
  value?: string;
  url?: string;
  title?: string;
  children?: TestNode[];
  data?: { hProperties?: Record<string, unknown> };
}

interface TestFile {
  path: string;
  data: Record<string, unknown>;
  fail: (message: string) => never;
}

const testFile = (
  local: readonly Record<string, unknown>[] = [],
): TestFile => ({
  path: 'lesson.mdx',
  data: {
    astro: {
      frontmatter: { notation: { local } },
    },
  },
  fail(message) {
    throw new Error(message);
  },
});

const transform = (
  tree: TestNode,
  file: TestFile,
  definitions: readonly Record<string, unknown>[],
) => {
  remarkNotation({ definitions })(tree, file);
  return { tree, file };
};

describe('remark notation authoring adapter', () => {
  it('turns prose terms into semantic links while leaving literal code alone', () => {
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Use \\term{discount-factor} here.' },
            { type: 'inlineCode', value: '\\term{discount-factor}' },
          ],
        },
      ],
    };
    const { file } = transform(tree, testFile(), [
      {
        key: 'discount-factor',
        title: 'discount factor',
        summary: 'Time-zero value of one deterministic future unit.',
      },
    ]);

    const paragraph = tree.children?.[0];
    expect(paragraph?.children).toEqual([
      { type: 'text', value: 'Use ' },
      expect.objectContaining({
        type: 'link',
        url: '/glossary/#notation-discount-factor',
        children: [{ type: 'text', value: 'discount factor' }],
        data: {
          hProperties: expect.objectContaining({
            className: ['notation-term'],
            'data-notation-key': 'discount-factor',
            'data-notation-trigger': '',
          }),
        },
      }),
      { type: 'text', value: ' here.' },
      { type: 'inlineCode', value: '\\term{discount-factor}' },
    ]);
    expect(file.data.notationReferences).toEqual([
      { key: 'discount-factor', kind: 'prose' },
    ]);
  });

  it('uses lexical page scope and records nested math annotations', () => {
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '\\term{rate}' }],
        },
        {
          type: 'math',
          value: '\\explain{present-value}{PV=\\explain{rate}{r}CF}',
        },
      ],
    };
    const file = testFile([
      {
        key: 'rate',
        title: 'page rate',
        summary: 'A local rate convention.',
        scope: 'local',
      },
    ]);
    transform(tree, file, [
      { key: 'rate', title: 'shared rate' },
      { key: 'present-value', title: 'present value' },
    ]);

    expect(tree.children?.[0]?.children?.[0]).toMatchObject({
      type: 'link',
      url: '#notation-rate',
      children: [{ type: 'text', value: 'page rate' }],
    });
    expect(tree.children?.[1]?.value).toBe(
      '\\explain{present-value}{PV=\\explain{rate}{r}CF}',
    );
    expect(file.data.notationReferences).toEqual([
      { key: 'rate', kind: 'prose' },
      { key: 'present-value', kind: 'math' },
      { key: 'rate', kind: 'math' },
    ]);
    expect(file.data.notationResolved).toMatchObject({
      rate: expect.objectContaining({ title: 'page rate' }),
      'present-value': expect.objectContaining({ title: 'present value' }),
    });
  });

  it('requires lesson prose to import shared definitions', () => {
    const file = testFile();
    file.data = {
      astro: {
        frontmatter: {
          lessonId: 'lesson.imports',
          notation: { uses: [], local: [] },
        },
      },
    };

    expect(() =>
      transform(
        {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: '\\term{known}' }],
            },
          ],
        },
        file,
        [{ key: 'known', title: 'known' }],
      ),
    ).toThrow(/not imported by notation\.uses/);
  });

  it('rejects unknown, malformed, and legacy inline definitions', () => {
    const definitions = [{ key: 'known', title: 'known' }];

    expect(() =>
      transform(
        {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: '\\term{missing}' }],
            },
          ],
        },
        testFile(),
        definitions,
      ),
    ).toThrow(/Unknown notation key "missing" in prose/);

    expect(() =>
      transform(
        {
          type: 'root',
          children: [{ type: 'math', value: '\\explain{known}' }],
        },
        testFile(),
        definitions,
      ),
    ).toThrow(/missing \{latex\}/);

    expect(() =>
      transform(
        {
          type: 'root',
          children: [{ type: 'math', value: '\\explain[inline]{known}{x}' }],
        },
        testFile(),
        definitions,
      ),
    ).toThrow(/Inline notation definitions/);

    expect(() =>
      transform(
        {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', value: '\\explain{known}{x} in prose' },
              ],
            },
          ],
        },
        testFile(),
        definitions,
      ),
    ).toThrow(/only supported inside/);
  });

  it('rejects direct htmlData commands in math', () => {
    expect(() =>
      transform(
        {
          type: 'root',
          children: [
            {
              type: 'math',
              value: String.raw`D(0,t)=\htmlData{notation-key=known}{D}`,
            },
          ],
        },
        testFile(),
        [{ key: 'known', title: 'known' }],
      ),
    ).toThrow(
      /Direct \\htmlData commands are not allowed; use \\explain\{semantic\.key\}\{latex\}/,
    );
  });
});
