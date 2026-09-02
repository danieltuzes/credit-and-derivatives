import { describe, expect, it } from 'vitest';
import remarkCitation from '../../src/reference/remark-citation.mjs';

interface TestNode {
  type: string;
  value?: string;
  url?: string;
  depth?: number;
  ordered?: boolean;
  children?: TestNode[];
  data?: { hProperties?: Record<string, unknown>; hName?: string };
}

interface TestFile {
  path: string;
  data: Record<string, unknown>;
  fail: (message: string) => never;
}

const sources = [
  {
    id: 'tuckman-serrat-fixed-income',
    type: 'book',
    title: 'Fixed Income Securities: Tools for Today\u2019s Markets',
    authors: ['Bruce Tuckman', 'Angel Serrat'],
    edition: '4',
    year: 2022,
    editorialStatus: 'draft',
  },
  {
    id: 'finra-bond-yield',
    type: 'official-guidance',
    title: 'Understanding Bond Yield and Return',
    organization: 'FINRA',
    url: 'https://www.finra.org/investors/insights/bond-yield-return',
    editorialStatus: 'draft',
  },
];

const file = (): TestFile => ({
  path: 'lesson.mdx',
  data: {},
  fail(message) {
    throw new Error(message);
  },
});

const paragraph = (value: string): TestNode => ({
  type: 'root',
  children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
});

const run = (tree: TestNode, testFile = file()) => {
  remarkCitation({ sources })(tree, testFile);
  return testFile;
};

const markers = (tree: TestNode): TestNode[] => {
  const found: TestNode[] = [];
  const walk = (node: TestNode) => {
    if (
      node.type === 'link' &&
      (node.data?.hProperties?.className as string[] | undefined)?.includes(
        'citation-ref',
      )
    ) {
      found.push(node);
    }
    node.children?.forEach(walk);
  };
  walk(tree);
  return found;
};

const referenceList = (tree: TestNode): TestNode | undefined =>
  tree.children?.find((node) => node.type === 'list' && node.ordered);

describe('remark citation adapter', () => {
  it('numbers each source by first appearance and reuses the number', () => {
    const tree = paragraph(
      'First [@tuckman-serrat-fixed-income] then [@finra-bond-yield] then again [@tuckman-serrat-fixed-income].',
    );
    const testFile = run(tree);

    const found = markers(tree);
    expect(found.map((node) => node.url)).toEqual([
      '#cite-1',
      '#cite-2',
      '#cite-1',
    ]);
    expect(found.map((node) => node.children?.[0]?.value)).toEqual([
      '[1]',
      '[2]',
      '[1]',
    ]);
    expect(testFile.data.citationReferences).toHaveLength(2);
  });

  it('gives one source two numbers when the locators differ', () => {
    const tree = paragraph(
      'See [@tuckman-serrat-fixed-income; \u00a71.2] and [@tuckman-serrat-fixed-income; \u00a73.2].',
    );
    run(tree);

    const list = referenceList(tree);
    expect(list?.children).toHaveLength(2);
    const text = (item: TestNode) =>
      item.children?.[0]?.children?.[0]?.value ?? '';
    expect(text(list!.children![0])).toContain('\u00a71.2');
    expect(text(list!.children![1])).toContain('\u00a73.2');
  });

  it('anchors the first marker and the list item so the backref resolves', () => {
    const tree = paragraph('Claim [@tuckman-serrat-fixed-income; \u00a71.1].');
    run(tree);

    const marker = markers(tree)[0];
    expect(marker.data?.hProperties?.id).toBe('cite-ref-1');
    expect(marker.data?.hProperties?.['data-citation-id']).toBe(
      'tuckman-serrat-fixed-income',
    );
    expect(marker.data?.hProperties?.['data-citation-locator']).toBe(
      '\u00a71.1',
    );

    const item = referenceList(tree)!.children![0];
    expect(item.data?.hProperties?.id).toBe('cite-1');
  });

  it('renders the source url when the record has one', () => {
    const tree = paragraph('Guidance [@finra-bond-yield].');
    run(tree);
    const item = referenceList(tree)!.children![0];
    const link = item.children?.[0]?.children?.find(
      (node) => node.type === 'link',
    );
    expect(link?.url).toBe(
      'https://www.finra.org/investors/insights/bond-yield-return',
    );
  });

  it('adds no reference section when a page cites nothing', () => {
    const tree = paragraph('Plain prose with no citation.');
    const testFile = run(tree);
    expect(referenceList(tree)).toBeUndefined();
    expect(testFile.data.citationReferences).toEqual([]);
  });

  it('reloads supplied sources for every document transform', () => {
    let suppliedSources = [sources[0]];
    const transform = remarkCitation({ sources: () => suppliedSources });

    const firstTree = paragraph('First [@tuckman-serrat-fixed-income].');
    transform(firstTree, file());
    expect(markers(firstTree)).toHaveLength(1);

    suppliedSources = [...sources];
    const addedAfterStartup = paragraph('Later [@finra-bond-yield].');
    transform(addedAfterStartup, file());

    expect(markers(addedAfterStartup)).toHaveLength(1);
    expect(referenceList(addedAfterStartup)?.children).toHaveLength(1);
  });

  it('ignores citation-like text inside code', () => {
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'inlineCode', value: '[@finra-bond-yield]' }],
        },
      ],
    };
    run(tree);
    expect(markers(tree)).toHaveLength(0);
    expect(referenceList(tree)).toBeUndefined();
  });

  it('fails on an unknown source id', () => {
    expect(() => run(paragraph('Bad [@no-such-source].'))).toThrow(
      /Unknown source id "no-such-source"/,
    );
  });

  it('fails on a malformed source id', () => {
    expect(() => run(paragraph('Bad [@bad-].'))).toThrow(/Invalid source id/);
  });

  it('fails on a stray, uncompletable citation open', () => {
    expect(() => run(paragraph('Bad [@Not A Key].'))).toThrow(
      /Malformed citation/,
    );
  });
});
