import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createNotationKatexOptions } from '../../src/reference/katex-options.mjs';
import rehypeFailKatexErrors from '../../src/reference/rehype-fail-katex-errors.mjs';
import remarkNotation from '../../src/reference/remark-notation.mjs';

const sharedDefinitions = [
  {
    key: 'signed-cash-flow',
    notation: 'CF_k',
    title: 'Signed cash-flow amount',
    summary: 'Amount received or paid at one event.',
  },
  {
    key: 'payment-time',
    notation: 't_k',
    title: 'Payment time',
    summary: 'Time from valuation to a scheduled event.',
  },
  {
    key: 'nominal-annual-rate',
    notation: String.raw`j^{(m)}`,
    title: 'Nominal annual rate',
    summary: 'Quoted annual rate under a stated compounding frequency.',
  },
  {
    key: 'compounding-frequency',
    notation: 'm',
    title: 'Compounding frequency',
    summary: 'Number of compounding periods in one year.',
  },
  {
    key: 'periodic-rate',
    notation: 'r_m',
    title: 'Periodic rate',
    summary: 'Rate applied once per compounding period.',
  },
];

const validFrontmatter = {
  lessonId: 'compiler.notation-fixture',
  notation: {
    local: [
      {
        key: 'payment-index',
        notation: 'k',
        title: 'Payment index',
        summary: 'Selects one row in the payment schedule.',
      },
    ],
  },
};

describe('Astro lesson-math compiler integration', () => {
  let compiler: Awaited<ReturnType<typeof createMarkdownProcessor>>;

  beforeAll(async () => {
    compiler = await createMarkdownProcessor({
      syntaxHighlight: false,
      smartypants: false,
      remarkPlugins: [
        remarkMath,
        [remarkNotation, { definitions: sharedDefinitions }],
      ],
      rehypePlugins: [
        [rehypeKatex, createNotationKatexOptions()],
        rehypeFailKatexErrors,
      ],
    });
  });

  it('compiles pure CF_k and concrete t_1 through remark, rehype, and KaTeX', async () => {
    const result = await compiler.render(
      String.raw`The [[signed-cash-flow]] is $CF_k$. Its concrete [[payment-time]] can be $t_1=0.5$ years.

$$
CF_k \quad\text{occurs at}\quad t_k.
$$`,
      {
        frontmatter: validFrontmatter,
        fileURL: new URL('file:///compiler-notation-fixture.mdx'),
      },
    );

    expect(result.code).toContain('data-notation-key="signed-cash-flow"');
    expect(result.code).toContain('data-notation-key="payment-index"');
    expect(result.code).toContain('data-notation-key="payment-time"');
    expect(result.code).toContain('<msub>');
    expect(result.code).not.toContain('katex-error');
  });

  it('compiles the periodic-rate fraction without a recovered KaTeX error', async () => {
    const result = await compiler.render(
      String.raw`The [[periodic-rate]], [[nominal-annual-rate]], and [[compounding-frequency]] satisfy $r_m=\frac{j^{(m)}}{m}$.`,
      {
        frontmatter: validFrontmatter,
        fileURL: new URL('file:///compiler-periodic-rate-fixture.mdx'),
      },
    );

    expect(result.code).toContain('data-notation-key="periodic-rate"');
    expect(result.code).toContain('data-notation-key="nominal-annual-rate"');
    expect(result.code).not.toContain('katex-error');
  });

  it('turns rehype-katex fallback markup into a compiler error', async () => {
    const rawKatexCompiler = await createMarkdownProcessor({
      syntaxHighlight: false,
      smartypants: false,
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeKatex, createNotationKatexOptions()],
        rehypeFailKatexErrors,
      ],
    });

    await expect(
      rawKatexCompiler.render(String.raw`Broken math: $CF_{$`, {
        fileURL: new URL('file:///compiler-broken-katex-fixture.mdx'),
      }),
    ).rejects.toThrow(/KaTeX rendering failed for "CF_\{": ParseError/);
  });

  it('rejects a variable that genuinely has no definition in lesson scope', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      await expect(
        compiler.render('An unbound variable is $t$.', {
          frontmatter: {
            lessonId: 'compiler.unresolved-fixture',
            notation: { local: [] },
          },
          fileURL: new URL('file:///compiler-unresolved-fixture.mdx'),
        }),
      ).rejects.toThrow(
        /Unresolved notation in lesson math: [^:]+:\d+:\d+: "t"/,
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('gates math inside a component slot at file:line:token', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      await expect(
        compiler.render(
          [
            'The [[signed-cash-flow]] recurs.',
            '',
            '<CompactExample label="x">',
            '',
            '$$',
            'CF_k + w',
            '$$',
            '',
            '</CompactExample>',
          ].join('\n'),
          {
            frontmatter: {
              lessonId: 'compiler.slot-fixture',
              notation: { local: [] },
            },
            fileURL: new URL('file:///compiler-slot-fixture.mdx'),
          },
        ),
      ).rejects.toThrow(
        /Unresolved notation in lesson math: [^:]+:\d+:\d+: "w"/,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
