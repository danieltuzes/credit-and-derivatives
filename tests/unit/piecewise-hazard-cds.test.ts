import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  simplifiedFlatHazardCdsLegFactors,
  simplifiedFlatHazardQuoteToUpfront,
} from '../../content/domain/cds/flat-hazard-cds';
import {
  fitPiecewiseHazardCreditCurve,
  piecewiseHazardCdsLegFactors,
  piecewiseHazardSurvivalProbability,
  transformMarketStandardQuoteCurve,
  type PiecewiseHazardSegment,
} from '../../content/domain/cds/piecewise-hazard-cds';

function expectRelativeClose(
  actual: number,
  expected: number,
  tolerance = 1e-11,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
}

const referenceSegments: readonly PiecewiseHazardSegment[] = [
  { endTimeYears: 1, hazardRatePerYear: 0.01 },
  { endTimeYears: 3, hazardRatePerYear: 0.03 },
  { endTimeYears: 5, hazardRatePerYear: 0.05 },
];

/** Hazard rate at a time under the reference segments (flat beyond the last knot). */
function referenceHazardAt(timeYears: number): number {
  for (const segment of referenceSegments) {
    if (timeYears <= segment.endTimeYears) return segment.hazardRatePerYear;
  }
  return referenceSegments[referenceSegments.length - 1]!.hazardRatePerYear;
}

describe('piecewise-constant hazard CDS leg factors', () => {
  it('matches independent numerical integration under a stepped hazard curve', () => {
    const rate = 0.03;
    const recovery = 0.4;
    const delta = 0.25;
    const termYears = 5;
    const periods = termYears / delta;
    const factors = piecewiseHazardCdsLegFactors({
      termYears,
      paymentFrequency: 4,
      continuouslyCompoundedRiskFreeRatePerYear: rate,
      recoveryRate: recovery,
      hazardSegments: referenceSegments,
    });

    // Midpoint quadrature on a fine grid, integrating the cumulative hazard
    // directly, is independent of the analytic one-period kernels.
    const bucketsPerPeriod = 20_000;
    const width = delta / bucketsPerPeriod;
    let scheduled = 0;
    let accrued = 0;
    let protection = 0;
    let cumulativeHazard = 0;
    for (let period = 0; period < periods; period += 1) {
      const start = period * delta;
      for (let bucket = 0; bucket < bucketsPerPeriod; bucket += 1) {
        const midpoint = start + (bucket + 0.5) * width;
        const hazard = referenceHazardAt(midpoint);
        const survivalAtMidpoint = Math.exp(
          -(cumulativeHazard + hazard * (bucket + 0.5) * width),
        );
        const discountedDensity =
          Math.exp(-rate * midpoint) * hazard * survivalAtMidpoint;
        accrued += (midpoint - start) * discountedDensity * width;
        protection += (1 - recovery) * discountedDensity * width;
      }
      cumulativeHazard += referenceHazardAt(start + delta / 2) * delta;
      const end = start + delta;
      scheduled += delta * Math.exp(-rate * end) * Math.exp(-cumulativeHazard);
    }

    expectRelativeClose(factors.scheduledPremiumAnnuityYears, scheduled);
    expectRelativeClose(factors.accruedOnDefaultAnnuityYears, accrued, 2e-10);
    expectRelativeClose(factors.protectionLegFactor, protection, 2e-10);
    expectRelativeClose(
      factors.survivalProbabilityAtMaturity,
      Math.exp(-cumulativeHazard),
    );
    expectRelativeClose(
      factors.parSpreadAnnualRate,
      protection / (scheduled + accrued),
      2e-10,
    );
  });

  it('reduces to the flat-hazard engine when there is one segment', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -0.02, max: 0.1, noNaN: true }),
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        fc.double({ min: 0, max: 0.9, noNaN: true }),
        fc.constantFrom(1, 2, 4),
        fc.integer({ min: 1, max: 10 }),
        (riskFreeRate, hazardRate, recoveryRate, frequency, termYears) => {
          const flat = simplifiedFlatHazardCdsLegFactors({
            termYears,
            paymentFrequency: frequency,
            continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
            constantRiskNeutralHazardRatePerYear: hazardRate,
            recoveryRate,
          });
          const stepped = piecewiseHazardCdsLegFactors({
            termYears,
            paymentFrequency: frequency,
            continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
            recoveryRate,
            hazardSegments: [
              { endTimeYears: termYears, hazardRatePerYear: hazardRate },
            ],
          });
          expectRelativeClose(
            stepped.premiumAnnuityYears,
            flat.premiumAnnuityYears,
            1e-10,
          );
          expectRelativeClose(
            stepped.protectionLegFactor,
            flat.protectionLegFactor,
            1e-10,
          );
          expectRelativeClose(
            stepped.parSpreadAnnualRate,
            flat.parSpreadAnnualRate,
            1e-10,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('extends the last segment flat and ignores knots beyond maturity', () => {
    const shortContract = piecewiseHazardCdsLegFactors({
      termYears: 2,
      paymentFrequency: 2,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      hazardSegments: referenceSegments,
    });
    const truncated = piecewiseHazardCdsLegFactors({
      termYears: 2,
      paymentFrequency: 2,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      hazardSegments: referenceSegments.slice(0, 2),
    });
    expectRelativeClose(
      shortContract.protectionLegFactor,
      truncated.protectionLegFactor,
    );

    const beyondLastKnot = piecewiseHazardCdsLegFactors({
      termYears: 7,
      paymentFrequency: 1,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      hazardSegments: referenceSegments,
    });
    const explicitFlatTail = piecewiseHazardCdsLegFactors({
      termYears: 7,
      paymentFrequency: 1,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      hazardSegments: [
        ...referenceSegments,
        { endTimeYears: 7, hazardRatePerYear: 0.05 },
      ],
    });
    expectRelativeClose(
      beyondLastKnot.premiumAnnuityYears,
      explicitFlatTail.premiumAnnuityYears,
    );
  });

  it('keeps survival non-increasing and consistent with the survival helper', () => {
    const factors = piecewiseHazardCdsLegFactors({
      termYears: 5,
      paymentFrequency: 4,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      hazardSegments: referenceSegments,
    });
    let previous = 1;
    for (const period of factors.periodContributions) {
      expect(period.survivalProbabilityAtPeriodStart).toBe(previous);
      expect(period.survivalProbabilityAtPeriodEnd).toBeLessThanOrEqual(
        previous,
      );
      expectRelativeClose(
        period.survivalProbabilityAtPeriodEnd,
        piecewiseHazardSurvivalProbability(
          referenceSegments,
          period.endTimeYears,
        ),
      );
      previous = period.survivalProbabilityAtPeriodEnd;
    }
    expectRelativeClose(
      piecewiseHazardSurvivalProbability(referenceSegments, 4),
      Math.exp(-(0.01 * 1 + 0.03 * 2 + 0.05 * 1)),
    );
    expectRelativeClose(
      piecewiseHazardSurvivalProbability(referenceSegments, 6),
      Math.exp(-(0.01 * 1 + 0.03 * 2 + 0.05 * 3)),
    );
    // Reference value used by the credit-curve lesson's assessment.
    expectRelativeClose(
      piecewiseHazardSurvivalProbability(
        [
          { endTimeYears: 2, hazardRatePerYear: 0.02 },
          { endTimeYears: 5, hazardRatePerYear: 0.05 },
        ],
        4,
      ),
      0.869358235,
      1e-8,
    );
  });

  it('rejects knots off the period grid, unordered segments, and bad scalars', () => {
    const base = {
      termYears: 5,
      paymentFrequency: 4,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
    };
    expect(() =>
      piecewiseHazardCdsLegFactors({
        ...base,
        hazardSegments: [
          { endTimeYears: 1.1, hazardRatePerYear: 0.01 },
          { endTimeYears: 5, hazardRatePerYear: 0.02 },
        ],
      }),
    ).toThrow(/period boundary/);
    expect(() =>
      piecewiseHazardCdsLegFactors({
        ...base,
        hazardSegments: [
          { endTimeYears: 3, hazardRatePerYear: 0.01 },
          { endTimeYears: 1, hazardRatePerYear: 0.02 },
        ],
      }),
    ).toThrow(/later than the previous segment end/);
    expect(() =>
      piecewiseHazardCdsLegFactors({ ...base, hazardSegments: [] }),
    ).toThrow(/at least one segment/);
    expect(() =>
      piecewiseHazardCdsLegFactors({
        ...base,
        hazardSegments: [{ endTimeYears: 5, hazardRatePerYear: -0.01 }],
      }),
    ).toThrow(/hazardRatePerYear/);
    expect(() =>
      piecewiseHazardCdsLegFactors({
        ...base,
        termYears: 2.3,
        hazardSegments: [{ endTimeYears: 5, hazardRatePerYear: 0.01 }],
      }),
    ).toThrow(/whole number of premium periods/);
    expect(() =>
      piecewiseHazardCdsLegFactors({
        ...base,
        recoveryRate: 1.2,
        hazardSegments: [{ endTimeYears: 5, hazardRatePerYear: 0.01 }],
      }),
    ).toThrow(/recoveryRate/);
  });
});

describe('credit curve transformation and fit', () => {
  const lessonCurve = {
    paymentFrequency: 4,
    continuouslyCompoundedRiskFreeRatePerYear: 0.02,
    recoveryRate: 0.4,
    fixedCouponAnnualRate: 0.01,
    tenorQuotes: [
      { termYears: 1, marketStandardQuoteAnnualRate: 0.008 },
      { termYears: 3, marketStandardQuoteAnnualRate: 0.012 },
      { termYears: 5, marketStandardQuoteAnnualRate: 0.016 },
    ],
  } as const;

  it('transforms each market-standard quote with its own flat hazard rate', () => {
    const marks = transformMarketStandardQuoteCurve(lessonCurve);
    expect(marks).toHaveLength(3);
    for (const [index, mark] of marks.entries()) {
      const quote = lessonCurve.tenorQuotes[index]!;
      // The flat converter's own par spread must be the quote itself.
      const flat = simplifiedFlatHazardCdsLegFactors({
        termYears: quote.termYears,
        paymentFrequency: 4,
        continuouslyCompoundedRiskFreeRatePerYear: 0.02,
        constantRiskNeutralHazardRatePerYear: mark.flatHazardRatePerYear,
        recoveryRate: 0.4,
      });
      expectRelativeClose(
        flat.parSpreadAnnualRate,
        quote.marketStandardQuoteAnnualRate,
        2e-10,
      );
      expectRelativeClose(
        mark.upfrontFractionPaidByProtectionBuyer,
        flat.premiumAnnuityYears * (quote.marketStandardQuoteAnnualRate - 0.01),
        2e-10,
      );
    }
    // Reference values displayed in the credit-curve lesson.
    expectRelativeClose(marks[0]!.flatHazardRatePerYear, 0.013300046, 1e-8);
    expectRelativeClose(marks[1]!.flatHazardRatePerYear, 0.019950083, 1e-8);
    expectRelativeClose(marks[2]!.flatHazardRatePerYear, 0.026600129, 1e-8);
    expectRelativeClose(
      marks[2]!.upfrontFractionPaidByProtectionBuyer,
      0.026694561,
      1e-8,
    );
  });

  it('fits segment hazards that reprice every tenor to its mark', () => {
    const marks = transformMarketStandardQuoteCurve(lessonCurve);
    const fit = fitPiecewiseHazardCreditCurve({
      paymentFrequency: 4,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      tenorMarks: marks,
    });
    expect(fit.hazardSegments).toHaveLength(3);
    for (const tenor of fit.tenors) {
      expect(Math.abs(tenor.repricingResidualFraction)).toBeLessThan(1e-11);
      // Re-value the tenor independently under the whole fitted curve.
      const factors = piecewiseHazardCdsLegFactors({
        termYears: tenor.termYears,
        paymentFrequency: 4,
        continuouslyCompoundedRiskFreeRatePerYear: 0.02,
        recoveryRate: 0.4,
        hazardSegments: fit.hazardSegments,
      });
      expectRelativeClose(
        factors.protectionLegFactor - 0.01 * factors.premiumAnnuityYears,
        tenor.upfrontFractionPaidByProtectionBuyer,
        1e-10,
      );
    }
    // The first tenor sees only one segment, so it equals the flat converter.
    expectRelativeClose(
      fit.tenors[0]!.segmentHazardRatePerYear,
      marks[0]!.flatHazardRatePerYear,
      1e-9,
    );
    expectRelativeClose(fit.tenors[0]!.parSpreadAnnualRate, 0.008, 1e-9);
    // Reference values displayed in the credit-curve lesson.
    expectRelativeClose(
      fit.tenors[1]!.segmentHazardRatePerYear,
      0.023463765,
      1e-8,
    );
    expectRelativeClose(
      fit.tenors[2]!.segmentHazardRatePerYear,
      0.037572831,
      1e-8,
    );
    expectRelativeClose(
      fit.tenors[1]!.survivalProbabilityAtMaturity,
      0.941550234,
      1e-8,
    );
    expectRelativeClose(
      fit.tenors[2]!.survivalProbabilityAtMaturity,
      0.873389867,
      1e-8,
    );
    expectRelativeClose(fit.tenors[1]!.parSpreadAnnualRate, 0.011993557, 1e-8);
    expectRelativeClose(fit.tenors[2]!.parSpreadAnnualRate, 0.015931834, 1e-8);
    expectRelativeClose(fit.tenors[2]!.premiumAnnuityYears, 4.500220799, 1e-8);
    expectRelativeClose(fit.tenors[2]!.protectionLegFactor, 0.071696769, 1e-8);
  });

  it('fits zero-upfront par marks exactly to their quotes', () => {
    const fit = fitPiecewiseHazardCreditCurve({
      paymentFrequency: 4,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
      tenorMarks: lessonCurve.tenorQuotes.map((quote) => ({
        termYears: quote.termYears,
        fixedCouponAnnualRate: quote.marketStandardQuoteAnnualRate,
        upfrontFractionPaidByProtectionBuyer: 0,
      })),
    });
    for (const [index, tenor] of fit.tenors.entries()) {
      expectRelativeClose(
        tenor.parSpreadAnnualRate,
        lessonCurve.tenorQuotes[index]!.marketStandardQuoteAnnualRate,
        1e-9,
      );
    }
  });

  it('fits segment hazards at or above each tenor flat hazard when par marks do not fall', () => {
    // A tenor par spread is an annuity-weighted average of its segments' flat
    // par spreads, so a non-decreasing set of par marks forces the newest
    // segment's flat par to be at least the tenor's own mark, and therefore
    // its hazard to be at least the flat hazard implied by that mark alone.
    // (Segment hazards themselves need not be monotone.)
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 0.05, noNaN: true }),
        fc.double({ min: 0, max: 0.02, noNaN: true }),
        fc.double({ min: 0, max: 0.02, noNaN: true }),
        (first, secondStep, thirdStep) => {
          const marks = [
            first,
            first + secondStep,
            first + secondStep + thirdStep,
          ];
          const terms = [1, 3, 5];
          const fit = fitPiecewiseHazardCreditCurve({
            paymentFrequency: 4,
            continuouslyCompoundedRiskFreeRatePerYear: 0.02,
            recoveryRate: 0.4,
            tenorMarks: marks.map((mark, index) => ({
              termYears: terms[index]!,
              fixedCouponAnnualRate: mark,
              upfrontFractionPaidByProtectionBuyer: 0,
            })),
          });
          for (const [index, tenor] of fit.tenors.entries()) {
            const flatHazard = simplifiedFlatHazardQuoteToUpfront({
              termYears: terms[index]!,
              paymentFrequency: 4,
              continuouslyCompoundedRiskFreeRatePerYear: 0.02,
              recoveryRate: 0.4,
              notional: 1,
              fixedCouponAnnualRate: marks[index]!,
              marketStandardQuoteAnnualRate: marks[index]!,
            }).impliedRiskNeutralHazardRatePerYear;
            expect(tenor.segmentHazardRatePerYear).toBeGreaterThanOrEqual(0);
            expect(tenor.segmentHazardRatePerYear).toBeGreaterThanOrEqual(
              flatHazard - 1e-9,
            );
            expect(Math.abs(tenor.repricingResidualFraction)).toBeLessThan(
              1e-10,
            );
          }
          expectRelativeClose(
            fit.tenors[0]!.segmentHazardRatePerYear,
            simplifiedFlatHazardQuoteToUpfront({
              termYears: 1,
              paymentFrequency: 4,
              continuouslyCompoundedRiskFreeRatePerYear: 0.02,
              recoveryRate: 0.4,
              notional: 1,
              fixedCouponAnnualRate: first,
              marketStandardQuoteAnnualRate: first,
            }).impliedRiskNeutralHazardRatePerYear,
            1e-9,
          );
        },
      ),
      { numRuns: 40 },
    );
  });

  it('rejects marks that would need a negative segment hazard rate', () => {
    expect(() =>
      fitPiecewiseHazardCreditCurve({
        paymentFrequency: 4,
        continuouslyCompoundedRiskFreeRatePerYear: 0.02,
        recoveryRate: 0.4,
        tenorMarks: [
          {
            termYears: 1,
            fixedCouponAnnualRate: 0.03,
            upfrontFractionPaidByProtectionBuyer: 0,
          },
          {
            termYears: 3,
            fixedCouponAnnualRate: 0.01,
            upfrontFractionPaidByProtectionBuyer: 0,
          },
        ],
      }),
    ).toThrow(/negative segment hazard rate/);
  });

  it('rejects unordered tenors, empty inputs, and non-identifying recovery', () => {
    const base = {
      paymentFrequency: 4,
      continuouslyCompoundedRiskFreeRatePerYear: 0.02,
      recoveryRate: 0.4,
    };
    expect(() =>
      fitPiecewiseHazardCreditCurve({ ...base, tenorMarks: [] }),
    ).toThrow(/at least one tenor/);
    expect(() =>
      fitPiecewiseHazardCreditCurve({
        ...base,
        tenorMarks: [
          {
            termYears: 3,
            fixedCouponAnnualRate: 0.01,
            upfrontFractionPaidByProtectionBuyer: 0,
          },
          {
            termYears: 1,
            fixedCouponAnnualRate: 0.01,
            upfrontFractionPaidByProtectionBuyer: 0,
          },
        ],
      }),
    ).toThrow(/later than the previous tenor/);
    expect(() =>
      fitPiecewiseHazardCreditCurve({
        ...base,
        recoveryRate: 1,
        tenorMarks: [
          {
            termYears: 1,
            fixedCouponAnnualRate: 0.01,
            upfrontFractionPaidByProtectionBuyer: 0,
          },
        ],
      }),
    ).toThrow(/recoveryRate/);
    expect(() =>
      fitPiecewiseHazardCreditCurve({
        ...base,
        tenorMarks: [
          {
            termYears: 1,
            fixedCouponAnnualRate: 0.01,
            upfrontFractionPaidByProtectionBuyer: 0.7,
          },
        ],
      }),
    ).toThrow(/loss-given-default upper bound/);
    expect(() =>
      transformMarketStandardQuoteCurve({ ...lessonCurve, tenorQuotes: [] }),
    ).toThrow(/at least one tenor/);
    expect(() =>
      transformMarketStandardQuoteCurve({
        ...lessonCurve,
        tenorQuotes: [
          { termYears: 5, marketStandardQuoteAnnualRate: 0.01 },
          { termYears: 3, marketStandardQuoteAnnualRate: 0.01 },
        ],
      }),
    ).toThrow(/later than the previous tenor/);
  });
});
