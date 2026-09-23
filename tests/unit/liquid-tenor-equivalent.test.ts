import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { liquidTenorEquivalent } from '../../content/domain/cds/liquid-tenor-equivalent';
import {
  simplifiedFlatHazardQuoteToUpfront,
  valueSimplifiedFlatHazardCds,
} from '../../content/domain/cds/flat-hazard-cds';

function expectRelativeClose(
  actual: number,
  expected: number,
  tolerance = 1e-11,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
}

const market = {
  continuouslyCompoundedRiskFreeRatePerYear: 0.02,
  recoveryRate: 0.4,
  liquidTenor: {
    termYears: 5,
    paymentFrequency: 4,
    fixedCouponAnnualRate: 0.01,
    marketStandardQuoteAnnualRate: 0.016,
  },
} as const;

describe('liquid-tenor equivalent notional', () => {
  it('reproduces an independent bump-and-reprice of the seven-year position', () => {
    const result = liquidTenorEquivalent({
      ...market,
      position: {
        termYears: 7,
        fixedCouponAnnualRate: 0.01,
        notional: 10_000_000,
        side: 'buy-protection',
      },
    });

    // Independent recomputation through the public flat-hazard converter.
    const baseHazard = simplifiedFlatHazardQuoteToUpfront({
      ...market.liquidTenor,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      notional: 1,
    }).impliedRiskNeutralHazardRatePerYear;
    const bumpedHazard = simplifiedFlatHazardQuoteToUpfront({
      ...market.liquidTenor,
      marketStandardQuoteAnnualRate: 0.0161,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      notional: 1,
    }).impliedRiskNeutralHazardRatePerYear;
    const valueAt = (hazard: number, termYears: number, notional: number) =>
      valueSimplifiedFlatHazardCds({
        termYears,
        paymentFrequency: 4,
        continuouslyCompoundedRiskFreeRatePerYear: 0.02,
        recoveryRate: 0.4,
        constantRiskNeutralHazardRatePerYear: hazard,
        notional,
        fixedCouponAnnualRate: 0.01,
      }).protectionBuyerPresentValueBeforeUpfront;
    const positionSensitivity =
      valueAt(bumpedHazard, 7, 10_000_000) - valueAt(baseHazard, 7, 10_000_000);
    const liquidSensitivity =
      valueAt(bumpedHazard, 5, 1) - valueAt(baseHazard, 5, 1);

    expectRelativeClose(result.baseHazardRatePerYear, baseHazard);
    expectRelativeClose(result.bumpedHazardRatePerYear, bumpedHazard);
    expectRelativeClose(result.positionSensitivity, positionSensitivity, 1e-9);
    expectRelativeClose(
      result.liquidTenorSensitivityPerUnitNotionalBought,
      liquidSensitivity,
      1e-9,
    );
    expectRelativeClose(
      result.equivalentNotional,
      positionSensitivity / liquidSensitivity,
      1e-9,
    );
    expect(result.equivalentSide).toBe('sell-protection');
    expect(Math.abs(result.hedgedSensitivity)).toBeLessThan(1e-6);

    // Reference values displayed in the equivalent-notional lesson.
    expectRelativeClose(result.baseHazardRatePerYear, 0.026600129, 1e-8);
    expectRelativeClose(result.bumpedHazardRatePerYear, 0.026766381, 1e-8);
    expectRelativeClose(result.basePositionValue, 357_482.24, 1e-7);
    expectRelativeClose(result.bumpedPositionValue, 363_240.36, 1e-7);
    expectRelativeClose(result.positionSensitivity, 5_758.12, 1e-6);
    expectRelativeClose(
      result.liquidTenorSensitivityPerUnitNotionalBought,
      0.000434070474,
      1e-8,
    );
    expectRelativeClose(result.equivalentNotional, 13_265_398.37, 1e-8);
    expectRelativeClose(result.equivalentRatio, 1.32653984, 1e-8);
  });

  it('flips the hedge side for a protection seller and matches the lesson example', () => {
    const result = liquidTenorEquivalent({
      ...market,
      position: {
        termYears: 3,
        fixedCouponAnnualRate: 0.05,
        notional: 20_000_000,
        side: 'sell-protection',
      },
    });
    expect(result.equivalentSide).toBe('buy-protection');
    expect(result.positionSensitivity).toBeLessThan(0);
    expectRelativeClose(result.basePositionValue, 1_899_072.4, 1e-8);
    expectRelativeClose(result.positionSensitivity, -6_046.59, 1e-6);
    expectRelativeClose(result.equivalentNotional, 13_929_977.23, 1e-8);
    expectRelativeClose(result.equivalentRatio, 0.69649886, 1e-8);
    expect(Math.abs(result.hedgedSensitivity)).toBeLessThan(1e-6);
  });

  it('hedges the liquid contract itself one for one on the opposite side', () => {
    for (const side of ['buy-protection', 'sell-protection'] as const) {
      const result = liquidTenorEquivalent({
        ...market,
        position: {
          termYears: 5,
          fixedCouponAnnualRate: 0.01,
          notional: 25_000_000,
          side,
        },
      });
      expectRelativeClose(result.equivalentRatio, 1, 1e-10);
      expect(result.equivalentSide).toBe(
        side === 'buy-protection' ? 'sell-protection' : 'buy-protection',
      );
    }
  });

  it('scales linearly with position notional and is odd in the position side', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.double({ min: 0, max: 0.06, noNaN: true }),
        fc.double({ min: 1_000, max: 100_000_000, noNaN: true }),
        (termYears, coupon, notional) => {
          const buyer = liquidTenorEquivalent({
            ...market,
            position: {
              termYears,
              fixedCouponAnnualRate: coupon,
              notional,
              side: 'buy-protection',
            },
          });
          const seller = liquidTenorEquivalent({
            ...market,
            position: {
              termYears,
              fixedCouponAnnualRate: coupon,
              notional,
              side: 'sell-protection',
            },
          });
          const doubled = liquidTenorEquivalent({
            ...market,
            position: {
              termYears,
              fixedCouponAnnualRate: coupon,
              notional: 2 * notional,
              side: 'buy-protection',
            },
          });
          expectRelativeClose(
            seller.positionSensitivity,
            -buyer.positionSensitivity,
            1e-9,
          );
          expectRelativeClose(
            seller.equivalentRatio,
            buyer.equivalentRatio,
            1e-9,
          );
          expect(seller.equivalentSide).not.toBe(buyer.equivalentSide);
          expectRelativeClose(
            doubled.equivalentNotional,
            2 * buyer.equivalentNotional,
            1e-9,
          );
          expectRelativeClose(
            doubled.equivalentRatio,
            buyer.equivalentRatio,
            1e-9,
          );
          expect(Math.abs(buyer.hedgedSensitivity)).toBeLessThan(1e-6);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('gives the same ratio whether the liquid quote is bumped as a spread or an upfront, in the small-bump limit', () => {
    const position = {
      termYears: 7,
      fixedCouponAnnualRate: 0.01,
      notional: 10_000_000,
      side: 'buy-protection',
    } as const;
    const spreadBump = liquidTenorEquivalent({
      ...market,
      position,
      quoteKind: 'market-standard-quote',
      bumpSize: 1e-7,
    });
    const upfrontBump = liquidTenorEquivalent({
      ...market,
      position,
      quoteKind: 'upfront-fraction',
      bumpSize: 1e-7,
    });
    expectRelativeClose(
      upfrontBump.equivalentRatio,
      spreadBump.equivalentRatio,
      1e-6,
    );
    expect(upfrontBump.baseQuote).toBeGreaterThan(0);
    expectRelativeClose(upfrontBump.bumpedQuote, upfrontBump.baseQuote + 1e-7);

    // With a one-basis-point bump the two quotations differ only through the
    // curvature of the finite bump.
    const spreadOneBp = liquidTenorEquivalent({ ...market, position });
    const upfrontOneBp = liquidTenorEquivalent({
      ...market,
      position,
      quoteKind: 'upfront-fraction',
    });
    expectRelativeClose(
      upfrontOneBp.equivalentRatio,
      spreadOneBp.equivalentRatio,
      5e-4,
    );
  });

  it('rejects invalid sides, quote kinds, bumps, and notionals', () => {
    const position = {
      termYears: 7,
      fixedCouponAnnualRate: 0.01,
      notional: 10_000_000,
      side: 'buy-protection',
    } as const;
    expect(() =>
      liquidTenorEquivalent({
        ...market,
        position: { ...position, side: 'long' as never },
      }),
    ).toThrow(/position\.side/);
    expect(() =>
      liquidTenorEquivalent({
        ...market,
        position,
        quoteKind: 'par-spread' as never,
      }),
    ).toThrow(/quoteKind/);
    expect(() =>
      liquidTenorEquivalent({ ...market, position, bumpSize: 0 }),
    ).toThrow(/bumpSize/);
    expect(() =>
      liquidTenorEquivalent({
        ...market,
        position: { ...position, notional: -1 },
      }),
    ).toThrow(/position\.notional/);
    expect(() =>
      liquidTenorEquivalent({
        ...market,
        position: { ...position, termYears: 2.3 },
      }),
    ).toThrow(/whole number of premium periods/);
  });
});
