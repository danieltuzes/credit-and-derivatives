import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  europeanOptionPayoff,
  europeanOptionWriterPayoff,
  putCallParityResidual,
  putValueFromParity,
} from '../../content/domain/derivatives/european-options';

describe('European option primitives', () => {
  it('calculates call and put holder payoffs', () => {
    expect(
      europeanOptionPayoff({
        kind: 'call',
        underlyingPriceAtExpiry: 115,
        strikePrice: 100,
      }),
    ).toBe(15);
    expect(
      europeanOptionPayoff({
        kind: 'put',
        underlyingPriceAtExpiry: 80,
        strikePrice: 100,
      }),
    ).toBe(20);
  });

  it('satisfies the pathwise call-minus-put identity', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: 0,
          max: 10_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.double({
          min: 0,
          max: 10_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (underlying, strike) => {
          const call = europeanOptionPayoff({
            kind: 'call',
            underlyingPriceAtExpiry: underlying,
            strikePrice: strike,
          });
          const put = europeanOptionPayoff({
            kind: 'put',
            underlyingPriceAtExpiry: underlying,
            strikePrice: strike,
          });
          return Math.abs(call - put - (underlying - strike)) <= 1e-10;
        },
      ),
    );
  });

  it('keeps holder and writer payoffs opposite', () => {
    const input = {
      kind: 'put' as const,
      underlyingPriceAtExpiry: 70,
      strikePrice: 90,
      quantity: 3,
    };
    expect(europeanOptionWriterPayoff(input)).toBe(
      -europeanOptionPayoff(input),
    );
  });

  it('solves and verifies put-call parity', () => {
    const put = putValueFromParity({
      callValue: 8,
      prepaidForwardPrice: 97,
      strikePrice: 100,
      discountFactorToExpiry: 0.95,
    });
    expect(put).toBe(6);
    expect(
      putCallParityResidual({
        callValue: 8,
        putValue: put,
        prepaidForwardPrice: 97,
        strikePrice: 100,
        discountFactorToExpiry: 0.95,
      }),
    ).toBeCloseTo(0, 12);
  });

  it('rejects invalid option and parity inputs', () => {
    expect(() =>
      europeanOptionPayoff({
        kind: 'call',
        underlyingPriceAtExpiry: -1,
        strikePrice: 1,
      }),
    ).toThrow(/underlyingPriceAtExpiry/);
    expect(() =>
      putCallParityResidual({
        callValue: 1,
        putValue: 1,
        prepaidForwardPrice: 1,
        strikePrice: 1,
        discountFactorToExpiry: 0,
      }),
    ).toThrow(/discountFactorToExpiry/);
  });
});
