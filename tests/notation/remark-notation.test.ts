import { describe, expect, it } from 'vitest';
import remarkNotation from '../../src/notation/remark-notation.mjs';

interface TestNode {
  type: string;
  value?: string;
  url?: string;
  title?: string;
  attributes?: Record<string, unknown>[];
  children?: TestNode[];
  data?: {
    hProperties?: Record<string, unknown>;
    hChildren?: TestNode[];
  };
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
  it('binds pure CF_k LaTeX from lesson scope so the rendered token is hoverable', () => {
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'inlineMath',
          value: 'CF_k',
          // This is the source snapshot created by mdast-util-math. A unit
          // test without it would miss the stale-rendering regression.
          data: { hChildren: [{ type: 'text', value: 'CF_k' }] },
        },
      ],
    };
    const file = testFile([
      {
        key: 'payment-index',
        notation: 'k',
        title: 'Payment index',
        summary: 'Selects one payment row.',
      },
    ]);
    file.data = {
      astro: {
        frontmatter: {
          lessonId: 'foundations.cash-flow-timelines',
          notation: {
            uses: ['signed-cash-flow'],
            local: [
              {
                key: 'payment-index',
                notation: 'k',
                title: 'Payment index',
                summary: 'Selects one payment row.',
              },
            ],
          },
        },
      },
    };

    transform(tree, file, [
      {
        key: 'signed-cash-flow',
        notation: 'CF_k',
        title: 'Signed cash flow',
        summary: 'A payment amount with an explicit sign.',
      },
    ]);

    expect(tree.children?.[0]?.value).toBe(
      '\\explain{signed-cash-flow}{CF_{\\explain{payment-index}{k}}}',
    );
    expect(tree.children?.[0]?.data?.hChildren).toEqual([
      {
        type: 'text',
        value: '\\explain{signed-cash-flow}{CF_{\\explain{payment-index}{k}}}',
      },
    ]);
    expect(file.data.notationReferences).toEqual([
      { key: 'signed-cash-flow', kind: 'math' },
      { key: 'payment-index', kind: 'math' },
    ]);
  });

  it('fails lesson math when a variable has no semantic definition in scope', () => {
    const file = testFile();
    file.data = {
      astro: {
        frontmatter: {
          lessonId: 'lesson.unresolved',
          notation: { uses: [], local: [] },
        },
      },
    };

    expect(() =>
      transform(
        {
          type: 'root',
          children: [{ type: 'inlineMath', value: 'z+1' }],
        },
        file,
        [],
      ),
    ).toThrow(/Unresolved notation in lesson math: "z" at offset 0/);
  });

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

  it('resolves component child Markdown without inspecting JSX attributes or expressions', () => {
    const flowAttributes = [
      {
        type: 'mdxJsxAttribute',
        name: 'label',
        value: String.raw`literal \term{not-in-scope} and $z$`,
      },
      {
        type: 'mdxJsxAttribute',
        name: 'computed',
        value: {
          type: 'mdxJsxAttributeValueExpression',
          value: String.raw`String.raw\`\term{not-in-scope}\``,
        },
      },
    ];
    const textAttributes = [
      {
        type: 'mdxJsxAttribute',
        name: 'title',
        value: String.raw`literal \term{also-not-in-scope}`,
      },
    ];
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'mdxJsxFlowElement',
          attributes: flowAttributes,
          children: [
            {
              type: 'mdxFlowExpression',
              value: String.raw`String.raw\`\term{not-in-scope}\``,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'mdxJsxTextElement',
                  attributes: textAttributes,
                  children: [
                    {
                      type: 'text',
                      value: 'Use \\term{signed-cash-flow}.',
                    },
                    {
                      type: 'inlineMath',
                      value: 'CF_k',
                      data: { hChildren: [{ type: 'text', value: 'CF_k' }] },
                    },
                    {
                      type: 'mdxTextExpression',
                      value: String.raw`String.raw\`\term{not-in-scope}\``,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const file = testFile([
      {
        key: 'payment-index',
        notation: 'k',
        title: 'Payment index',
      },
    ]);
    file.data = {
      astro: {
        frontmatter: {
          lessonId: 'lesson.component-content',
          notation: {
            uses: ['signed-cash-flow'],
            local: [
              {
                key: 'payment-index',
                notation: 'k',
                title: 'Payment index',
              },
            ],
          },
        },
      },
    };

    transform(tree, file, [
      {
        key: 'signed-cash-flow',
        notation: 'CF_k',
        title: 'Signed cash flow',
      },
    ]);

    const component = tree.children?.[0];
    const flowExpression = component?.children?.[0];
    const paragraph = component?.children?.[1];
    const textComponent = paragraph?.children?.[0];
    expect(component?.attributes).toBe(flowAttributes);
    expect(flowExpression?.value).toContain('\\term{not-in-scope}');
    expect(textComponent?.attributes).toBe(textAttributes);
    expect(textComponent?.children?.[1]).toMatchObject({
      type: 'link',
      url: '/glossary/#notation-signed-cash-flow',
    });
    expect(textComponent?.children?.[3]?.value).toBe(
      '\\explain{signed-cash-flow}{CF_{\\explain{payment-index}{k}}}',
    );
    expect(textComponent?.children?.[4]?.value).toContain(
      '\\term{not-in-scope}',
    );
    expect(file.data.notationReferences).toEqual([
      { key: 'signed-cash-flow', kind: 'prose' },
      { key: 'signed-cash-flow', kind: 'math' },
      { key: 'payment-index', kind: 'math' },
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

  const registryFile = (path = 'src/content/notation/bond-price.md') => ({
    path,
    data: { astro: { frontmatter: {} } },
    fail(message: string): never {
      throw new Error(message);
    },
  });

  const bondRegistry = [
    { key: 'bond-price', notation: 'P_0' },
    { key: 'bond-payment-index', notation: 'k' },
    { key: 'number-of-bond-payments', notation: 'n' },
    { key: 'bond-cash-flow', notation: 'CF_k^{\\mathrm{bond}}' },
    { key: 'discount-factor', notation: 'D(0,t)' },
    { key: 'payment-time', notation: 't_k' },
  ];

  it('binds ordinary LaTeX in a notation registry page against the whole registry', () => {
    const source = 'P_0=\\sum_{k=1}^{n}CF_k^{\\mathrm{bond}}D(0,t_k).';
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'math',
          value: source,
          data: {
            hChildren: [
              {
                type: 'element',
                tagName: 'code',
                children: [{ type: 'text', value: source }],
              } as unknown as TestNode,
            ],
          },
        },
      ],
    };
    const file = registryFile();

    remarkNotation({ definitions: bondRegistry })(tree as never, file as never);

    const bound = tree.children?.[0]?.value ?? '';
    expect(bound).toContain('\\explain{bond-price}{P_0}');
    // The unique function head binds via base fallback: D(0,t) has concrete
    // arguments here, so only the head glyph is wrapped.
    expect(bound).toContain('\\explain{discount-factor}{D}');
    expect(bound).toContain('\\explain{bond-cash-flow}{');
    expect(bound).toContain('\\explain{payment-time}{t_{');
    // rehype-katex reads the hast snapshot, so it must be rewritten too.
    expect(tree.children?.[0]?.data?.hChildren?.[0]?.children?.[0]?.value).toBe(
      bound,
    );
    expect(
      (file as unknown as { data: { notationReferences: unknown[] } }).data
        .notationReferences,
    ).toEqual(
      expect.arrayContaining([{ key: 'discount-factor', kind: 'math' }]),
    );
  });

  it('fails a notation registry page when a symbol resolves to nothing', () => {
    expect(() =>
      remarkNotation({ definitions: bondRegistry })(
        {
          type: 'root',
          children: [{ type: 'inlineMath', value: 'w' }],
        } as never,
        registryFile('src/content/notation/mystery.md') as never,
      ),
    ).toThrow(
      /Unresolved notation in notation definition math: "w" at offset 0/,
    );
  });

  it('leaves math untouched in ordinary prose pages outside the registry', () => {
    const tree: TestNode = {
      type: 'root',
      children: [{ type: 'inlineMath', value: 'P_0' }],
    };
    remarkNotation({ definitions: bondRegistry })(
      tree as never,
      { path: 'src/content/docs/about.md', data: {}, fail() {} } as never,
    );
    expect(tree.children?.[0]?.value).toBe('P_0');
  });
});
