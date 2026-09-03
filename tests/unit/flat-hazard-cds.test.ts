import { describe, expect, it } from 'vitest';
import {
  simplifiedFlatHazardCdsLegFactors,
  simplifiedFlatHazardQuoteToUpfront,
  simplifiedFlatHazardUpfrontToQuote,
  valueSimplifiedFlatHazardCds,
  type SimplifiedFlatHazardCdsModelInput,
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

const referenceModel: SimplifiedFlatHazardCdsModelInput = {
  termYears: 5,
  paymentFrequency: 4,
  continuouslyCompoundedRiskFreeRatePerYear: 0.04,
  constantRiskNeutralHazardRatePerYear: 0.025,
  recoveryRate: 0.4,
};

describe('exact default-time flat-hazard CDS factors', () => {
  it('matches independent numerical integration of every default-time payoff', () => {
    const factors = simplifiedFlatHazardCdsLegFactors(referenceModel);
    const { termYears, paymentFrequency } = referenceModel;
    const rate = referenceModel.continuouslyCompoundedRiskFreeRatePerYear;
    const hazard = referenceModel.constantRiskNeutralHazardRatePerYear;
    const recovery = referenceModel.recoveryRate;
    const delta = 1 / paymentFrequency;
    const periods = termYears * paymentFrequency;

    let scheduled = 0;
    for (let period = 1; period <= periods; period += 1) {
      const time = period * delta;
      scheduled += delta * Math.exp(-rate * time) * Math.exp(-hazard * time);
    }

    // Midpoint quadrature is intentionally independent from the analytic
    // exponential moments used by the production implementation.
    const bucketsPerPeriod = 20_000;
    const width = delta / bucketsPerPeriod;
    let accrued = 0;
    let protection = 0;
    for (let period = 0; period < periods; period += 1) {
      const start = period * delta;
      for (let bucket = 0; bucket < bucketsPerPeriod; bucket += 1) {
        const defaultTime = start + (bucket + 0.5) * width;
        const discountedDensity =
          Math.exp(-rate * defaultTime) *
          hazard *
          Math.exp(-hazard * defaultTime);
        accrued += (defaultTime - start) * discountedDensity * width;
        protection += (1 - recovery) * discountedDensity * width;
      }
    }

    expectRelativeClose(factors.scheduledPremiumAnnuityYears, scheduled);
    expectRelativeClose(factors.accruedOnDefaultAnnuityYears, accrued, 2e-10);
    expectRelativeClose(factors.protectionLegFactor, protection, 2e-10);
    expectRelativeClose(
      factors.parSpreadAnnualRate,
      protection / (scheduled + accrued),
      2e-10,
    );
  });

  it('uses survival for scheduled premiums and has no default cash flow at zero hazard', () => {
    const factors = simplifiedFlatHazardCdsLegFactors({
      ...referenceModel,
      termYears: 1,
      paymentFrequency: 2,
      constantRiskNeutralHazardRatePerYear: 0,
    });
    const expectedScheduled =
      0.5 * Math.exp(-0.04 * 0.5) + 0.5 * Math.exp(-0.04);

    expectRelativeClose(
      factors.scheduledPremiumAnnuityYears,
      expectedScheduled,
    );
    expect(factors.accruedOnDefaultAnnuityYears).toBe(0);
    expect(factors.protectionLegFactor).toBe(0);
    expect(factors.parSpreadAnnualRate).toBe(0);
  });

  it('uses stable limiting moments when risk-free rate plus hazard is zero', () => {
    const hazard = 0.03;
    const factors = simplifiedFlatHazardCdsLegFactors({
      termYears: 1,
      paymentFrequency: 2,
      continuouslyCompoundedRiskFreeRatePerYear: -hazard,
      constantRiskNeutralHazardRatePerYear: hazard,
      recoveryRate: 0.25,
    });

    expectRelativeClose(factors.scheduledPremiumAnnuityYears, 1);
    expectRelativeClose(
      factors.accruedOnDefaultAnnuityYears,
      (2 * hazard * 0.5 ** 2) / 2,
    );
    expectRelativeClose(factors.protectionLegFactor, (1 - 0.25) * hazard);
  });

  it('values exact accrued premium at the modeled default time', () => {
    const notional = 10_000_000;
    const coupon = 0.012;
    const value = valueSimplifiedFlatHazardCds({
      ...referenceModel,
      notional,
      fixedCouponAnnualRate: coupon,
    });

    expectRelativeClose(
      value.scheduledPremiumPresentValue,
      notional * coupon * value.scheduledPremiumAnnuityYears,
    );
    expectRelativeClose(
      value.accruedOnDefaultPresentValue,
      notional * coupon * value.accruedOnDefaultAnnuityYears,
    );
    expectRelativeClose(
      value.protectionLegPresentValue,
      notional * value.protectionLegFactor,
    );
    expectRelativeClose(value.protectionBuyerPresentValueAfterFairUpfront, 0);
  });
});

describe('simplified MSQ and upfront conversion', () => {
  const quoteInput = {
    termYears: 5,
    paymentFrequency: 4,
    continuouslyCompoundedRiskFreeRatePerYear: 0.04,
    recoveryRate: 0.4,
    notional: 10_000_000,
    fixedCouponAnnualRate: 0.01,
    marketStandardQuoteAnnualRate: 0.015,
  } as const;

  it('infers one pricing hazard and adds the signed upfront needed for zero buyer value', () => {
    const converted = simplifiedFlatHazardQuoteToUpfront(quoteInput);

    expectRelativeClose(converted.parSpreadAnnualRate, 0.015, 2e-11);
    expect(converted.fairUpfrontAmountPaidByProtectionBuyer).toBeGreaterThan(0);
    expectRelativeClose(
      converted.protectionLegPresentValue,
      converted.premiumLegPresentValue +
        converted.fairUpfrontAmountPaidByProtectionBuyer,
    );
    expectRelativeClose(
      converted.fairUpfrontAmountPaidByProtectionBuyer,
      quoteInput.notional *
        converted.premiumAnnuityYears *
        (quoteInput.marketStandardQuoteAnnualRate -
          quoteInput.fixedCouponAnnualRate),
      2e-10,
    );
  });

  it('returns zero upfront when the standard coupon equals the quote', () => {
    const converted = simplifiedFlatHazardQuoteToUpfront({
      ...quoteInput,
      fixedCouponAnnualRate: quoteInput.marketStandardQuoteAnnualRate,
    });

    expect(
      Math.abs(converted.fairUpfrontAmountPaidByProtectionBuyer),
    ).toBeLessThan(0.0001);
  });

  it('round-trips the signed upfront through the inverse root solve', () => {
    const forward = simplifiedFlatHazardQuoteToUpfront(quoteInput);
    const inverse = simplifiedFlatHazardUpfrontToQuote({
      termYears: quoteInput.termYears,
      paymentFrequency: quoteInput.paymentFrequency,
      continuouslyCompoundedRiskFreeRatePerYear:
        quoteInput.continuouslyCompoundedRiskFreeRatePerYear,
      recoveryRate: quoteInput.recoveryRate,
      notional: quoteInput.notional,
      fixedCouponAnnualRate: quoteInput.fixedCouponAnnualRate,
      upfrontAmountPaidByProtectionBuyer:
        forward.fairUpfrontAmountPaidByProtectionBuyer,
    });

    expectRelativeClose(inverse.marketStandardQuoteAnnualRate, 0.015, 2e-10);
    expectRelativeClose(
      inverse.impliedRiskNeutralHazardRatePerYear,
      forward.impliedRiskNeutralHazardRatePerYear,
      2e-10,
    );
  });

  it('rejects impossible or non-identifying quote conversions', () => {
    expect(() =>
      simplifiedFlatHazardQuoteToUpfront({
        ...quoteInput,
        recoveryRate: 1,
      }),
    ).toThrow(/recoveryRate must be below one/);
    expect(() =>
      simplifiedFlatHazardUpfrontToQuote({
        ...quoteInput,
        upfrontAmountPaidByProtectionBuyer: quoteInput.notional,
      }),
    ).toThrow(/upper bound/);
  });
});
