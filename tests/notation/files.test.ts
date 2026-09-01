import { describe, expect, it } from 'vitest';
import { extractNotationReferences } from '../../src/content/collections';

const pairs = (text: string) =>
  extractNotationReferences(text, 'lesson.md', undefined).map(
    ({ key, kind }) => ({ key, kind }),
  );

describe('notation reference extraction', () => {
  it('reads ordinary Markdown \\term{} and ignores code fences and inline code', () => {
    const body = [
      'Use \\term{rate} in ordinary Markdown.',
      '',
      'Literal examples stay inert: `\\term{ignored-inline}`.',
      '',
      '```tex',
      '\\term{ignored-fence}',
      '\\explain{ignored-fence}{x}',
      '```',
      '',
    ].join('\n');

    expect(pairs(body)).toEqual([{ key: 'rate', kind: 'prose' }]);
  });

  it('reads MDX-safe \\term\\{\\} braces and \\explain{} math references', () => {
    const body =
      'Use \\term\\{rate\\} in MDX and annotate $\\explain{rate}{r}$.\n';

    expect(pairs(body)).toEqual([
      { key: 'rate', kind: 'prose' },
      { key: 'rate', kind: 'math' },
    ]);
  });
});
