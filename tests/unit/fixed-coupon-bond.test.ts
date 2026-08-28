import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createFixedCouponBond,
  macaulayDuration,
  priceFixedCouponBond,
} from '../../src/domain/bonds/fixed-coupon-bond';

function expectRelativeClose(
  actual: number,
  expected: number,
  tolerance = 1e-10,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
}

describe('fixed coupon bond', () => {
  it('matches a worked example', () => {
    const bond = createFixedCouponBond({
      faceValue: 100,
      annualCouponRate: 0.05,
      termYears: 5,
      paymentFrequency: 2,
    });

    expect(priceFixedCouponBond(bond, 0.06)).toBeCloseTo(95.7349, 4);
  });

  it('prices at par when coupon rate equals yield', () => {
    fc.assert(
      fc.property(
        fc.record({
          faceValue: fc.double({
            min: 1,
            max: 1_000_000,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          termYears: fc.integer({ min: 1, max: 30 }),
          paymentFrequency: fc.constantFrom<1 | 2 | 4>(1, 2, 4),
          rate: fc.double({
            min: 0,
            max: 0.25,
            noNaN: true,
            noDefaultInfinity: true,
          }),
        }),
        ({ faceValue, termYears, paymentFrequency, rate }) => {
          const bond = createFixedCouponBond({
            faceValue,
            annualCouponRate: rate,
            termYears,
            paymentFrequency,
          });
          const price = priceFixedCouponBond(bond, rate);
          return (
            Math.abs(price - faceValue) <=
            1e-9 * Math.max(1, Math.abs(faceValue))
          );
        },
      ),
      { numRuns: 250 },
    );
  });

  it('decreases strictly as yield rises', () => {
    const yields = [-0.01, 0, 0.02, 0.05, 0.1, 0.25];
    for (const coupon of [0, 0.03, 0.08]) {
      for (const termYears of [1, 5, 20]) {
        const bond = createFixedCouponBond({
          faceValue: 100,
          annualCouponRate: coupon,
          termYears,
          paymentFrequency: 2,
        });
        const prices = yields.map((yieldToMaturity) =>
          priceFixedCouponBond(bond, yieldToMaturity),
        );
        for (let index = 1; index < prices.length; index += 1) {
          expect(prices[index]).toBeLessThan(prices[index - 1]);
        }
      }
    }
  });

  it('matches the zero-coupon closed form and has bounded duration', () => {
    const bond = createFixedCouponBond({
      faceValue: 100,
      annualCouponRate: 0,
      termYears: 7,
      paymentFrequency: 2,
    });
    expectRelativeClose(priceFixedCouponBond(bond, 0.04), 100 / 1.02 ** 14);
    expectRelativeClose(macaulayDuration(bond, 0.04), 7);
  });

  it('scales linearly with face value', () => {
    const unit = createFixedCouponBond({
      faceValue: 1,
      annualCouponRate: 0.07,
      termYears: 8,
      paymentFrequency: 4,
    });
    const large = createFixedCouponBond({
      faceValue: 1_000,
      annualCouponRate: 0.07,
      termYears: 8,
      paymentFrequency: 4,
    });
    expectRelativeClose(
      priceFixedCouponBond(large, 0.09),
      1_000 * priceFixedCouponBond(unit, 0.09),
    );
  });

  it('rejects invalid contracts and yields', () => {
    expect(() =>
      createFixedCouponBond({
        faceValue: 0,
        annualCouponRate: 0.05,
        termYears: 5,
        paymentFrequency: 2,
      }),
    ).toThrow(/faceValue/);
    expect(() =>
      createFixedCouponBond({
        faceValue: 100,
        annualCouponRate: -0.01,
        termYears: 5,
        paymentFrequency: 2,
      }),
    ).toThrow(/annualCouponRate/);
    expect(() =>
      createFixedCouponBond({
        faceValue: 100,
        annualCouponRate: 0.05,
        termYears: 1.3,
        paymentFrequency: 2,
      }),
    ).toThrow(/whole number/);

    const bond = createFixedCouponBond({
      faceValue: 100,
      annualCouponRate: 0.05,
      termYears: 5,
      paymentFrequency: 2,
    });
    expect(() => priceFixedCouponBond(bond, -2)).toThrow(
      /greater than -periodsPerYear/,
    );
  });
});
