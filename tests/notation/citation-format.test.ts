import { describe, expect, it } from 'vitest';
import {
  formatReferenceText,
  formatSourceLabel,
  referenceLabelFromText,
} from 'explico/reference/citation-format.mjs';

const tuckman = {
  id: 'tuckman-serrat-fixed-income',
  title: 'Fixed Income Securities: Tools for Today’s Markets',
  authors: ['Bruce Tuckman', 'Angel Serrat'],
  edition: '4',
  year: 2022,
};

const finra = {
  id: 'finra-bond-yield',
  title: 'Understanding Bond Yield and Return',
  organization: 'FINRA',
};

describe('referenceLabelFromText', () => {
  it('recovers the label by stripping the locator tail formatReferenceText adds', () => {
    const line = formatReferenceText(tuckman, '§3.2, eqs. 1-3');
    expect(referenceLabelFromText(line, '§3.2, eqs. 1-3')).toBe(
      formatSourceLabel(tuckman),
    );
  });

  it('returns the whole line when there is no locator', () => {
    const line = formatReferenceText(finra, undefined);
    expect(referenceLabelFromText(line, '')).toBe(formatSourceLabel(finra));
  });

  it('collapses whitespace and tolerates a missing tail', () => {
    expect(referenceLabelFromText('  Author,  Title (2020).  ', 'p. 7')).toBe(
      'Author, Title (2020)',
    );
  });
});
