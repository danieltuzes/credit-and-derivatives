import { describe, expect, it } from 'vitest';
import {
  periodicDiscountFactor,
  presentValue,
} from '../../src/domain/present-value';

function expectRelativeClose(
  actual: number,
  expected: number,
  tolerance = 1e-11,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
}

describe('presentValue', () => {
  it('returns zero for an empty schedule', () => {
    expect(presentValue([], () => 1)).toBe(0);
  });

  it('discounts dated cash flows', () => {
    expectRelativeClose(
      presentValue(
        [
          { timeYears: 0, amount: -100 },
          { timeYears: 1, amount: 110 },
        ],
        periodicDiscountFactor(0.05, 1),
      ),
      110 / 1.05 - 100,
    );
  });

  it('is additive', () => {
    const first = [
      { timeYears: 1, amount: 10 },
      { timeYears: 3, amount: 30 },
    ];
    const second = [
      { timeYears: 2, amount: -5 },
      { timeYears: 4, amount: 100 },
    ];
    const discountFactor = periodicDiscountFactor(0.04, 2);

    expectRelativeClose(
      presentValue([...first, ...second], discountFactor),
      presentValue(first, discountFactor) +
        presentValue(second, discountFactor),
    );
  });

  it('scales linearly with cash-flow amounts', () => {
    const cashFlows = [
      { timeYears: 0.5, amount: -20 },
      { timeYears: 2, amount: 75 },
      { timeYears: 8, amount: 120 },
    ];
    const scaledCashFlows = cashFlows.map((cashFlow) => ({
      ...cashFlow,
      amount: 1_000 * cashFlow.amount,
    }));
    const discountFactor = periodicDiscountFactor(0.03, 4);

    expectRelativeClose(
      presentValue(scaledCashFlows, discountFactor),
      1_000 * presentValue(cashFlows, discountFactor),
    );
  });

  it('rejects invalid inputs', () => {
    expect(() => presentValue([{ timeYears: -1, amount: 1 }], () => 1)).toThrow(
      /timeYears/,
    );
    expect(() =>
      presentValue([{ timeYears: 1, amount: Number.NaN }], () => 1),
    ).toThrow(/finite/);
    expect(() =>
      presentValue([{ timeYears: 1, amount: 1 }], () => -0.1),
    ).toThrow(/non-negative/);
    expect(() =>
      presentValue([{ timeYears: 1, amount: 1 }], () => Number.NaN),
    ).toThrow(/finite/);
    expect(() =>
      presentValue([{ timeYears: 1, amount: Number.MAX_VALUE }], () => 2),
    ).toThrow(/finite/);
    expect(() => periodicDiscountFactor(-2, 2)).toThrow(
      /greater than -periodsPerYear/,
    );
    expect(() => periodicDiscountFactor(0.05, 0)).toThrow(/periodsPerYear/);
    expect(() => periodicDiscountFactor(0.05, 2.5)).toThrow(/integer/);
    expect(() => periodicDiscountFactor(Number.NaN, 2)).toThrow(
      /nominalAnnualRate/,
    );
    expect(() =>
      periodicDiscountFactor(0.05, Number.POSITIVE_INFINITY),
    ).toThrow(/periodsPerYear/);
    expect(() => periodicDiscountFactor(0.05, 2)(-0.5)).toThrow(/timeYears/);
  });
});
