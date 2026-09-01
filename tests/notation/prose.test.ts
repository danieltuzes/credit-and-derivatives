import { describe, expect, it } from 'vitest';
import { isSubstantiveMeaning } from '../../src/notation/prose';

describe('notation meaning safeguard (C1b)', () => {
  it('accepts a real one-line definition', () => {
    expect(
      isSubstantiveMeaning(
        'Actual calendar days from the previous coupon date through settlement.',
      ),
    ).toBe(true);
  });

  it('rejects fewer than four words', () => {
    expect(isSubstantiveMeaning('Elapsed actual days')).toBe(false);
  });

  it('rejects placeholder phrases regardless of length padding', () => {
    for (const placeholder of [
      'a variable',
      'A value.',
      'TODO',
      'see above',
      'placeholder',
      'n/a',
    ]) {
      expect(isSubstantiveMeaning(placeholder)).toBe(false);
    }
  });
});
