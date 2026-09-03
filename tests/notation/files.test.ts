import { describe, expect, it } from 'vitest';
import { extractNotationReferences } from '../../src/compiler/collections';

const pairs = (text: string) =>
  extractNotationReferences(text, 'lesson.md', undefined).map(
    ({ key, kind }) => ({ key, kind }),
  );

describe('notation reference extraction', () => {
  it('reads [[key]] prose refs and ignores code fences and inline code', () => {
    const body = [
      'Use [[rate]] in ordinary Markdown.',
      '',
      'Literal examples stay inert: `[[ignored-inline]]`.',
      '',
      '```tex',
      '[[ignored-fence]]',
      '\\explain{ignored-fence}{x}',
      '```',
      '',
    ].join('\n');

    expect(pairs(body)).toEqual([{ key: 'rate', kind: 'prose' }]);
  });

  it('reads [[key]] prose refs and \\explain{} math references together', () => {
    const body = 'Use [[rate]] in MDX and annotate $\\explain{rate}{r}$.\n';

    expect(pairs(body)).toEqual([
      { key: 'rate', kind: 'prose' },
      { key: 'rate', kind: 'math' },
    ]);
  });
});
