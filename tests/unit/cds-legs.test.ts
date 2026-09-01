import { describe, expect, it } from 'vitest';
import {
  cdsLegFactors,
  createRegularCdsPeriods,
  parCdsSpread,
  valueCdsLegs,
  type AccruedOnDefaultAssumption,
  type CdsLegModelInput,
  type CdsPeriod,
} from '../../src/domain/cds/cds-legs';
import { constantHazardSurvivalProbability } from '../../src/domain/credit/survival';
import { periodicDiscountFactor } from '../../src/domain/present-value';

function expectRelativeClose(
  actual: number,
  expected: number,
  tolerance = 1e-11,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
}

const referencePeriods: readonly CdsPeriod[] = [
  {
    startTimeYears: 0,
    endTimeYears: 0.5,
    paymentTimeYears: 0.5,
    accrualYearFraction: 0.5,
    defaultDiscountTimeYears: 0.5,
    expectedAccruedOnDefaultYearFraction: 0.25,
  },
  {
    startTimeYears: 0.5,
    endTimeYears: 1,
    paymentTimeYears: 1,
    accrualYearFraction: 0.5,
    defaultDiscountTimeYears: 1,
    expectedAccruedOnDefaultYearFraction: 0.25,
  },
];

function referenceModel(): CdsLegModelInput {
  return {
    recoveryRate: 0.4,
    periods: referencePeriods,
    discountFactor: (timeYears) => {
      if (timeYears === 0.5) return 0.99;
      if (timeYears === 1) return 0.97;
      throw new Error(`unexpected discount time ${timeYears}`);
    },
    survivalProbability: (timeYears) => {
      if (timeYears === 0) return 1;
      if (timeYears === 0.5) return 0.98;
      if (timeYears === 1) return 0.95;
      throw new Error(`unexpected survival time ${timeYears}`);
    },
  };
}

function regularModel(
  accruedOnDefault: AccruedOnDefaultAssumption = 'half-period',
): CdsLegModelInput {
  return {
    recoveryRate: 0.4,
    periods: createRegularCdsPeriods({
      termYears: 5,
      paymentFrequency: 4,
      accruedOnDefault,
    }),
    discountFactor: periodicDiscountFactor(0.04, 4),
    survivalProbability: constantHazardSurvivalProbability(0.03),
  };
}

describe('regular CDS model-year period builder', () => {
  it('builds explicit quarterly period-end timings and half-period accrual', () => {
    const periods = createRegularCdsPeriods({
      termYears: 1,
      paymentFrequency: 4,
      accruedOnDefault: 'half-period',
    });

    expect(periods).toHaveLength(4);
    expect(periods[0]).toEqual({
      startTimeYears: 0,
      endTimeYears: 0.25,
      paymentTimeYears: 0.25,
      accrualYearFraction: 0.25,
      defaultDiscountTimeYears: 0.25,
      expectedAccruedOnDefaultYearFraction: 0.125,
    });
    expect(periods[3]).toEqual({
      startTimeYears: 0.75,
      endTimeYears: 1,
      paymentTimeYears: 1,
      accrualYearFraction: 0.25,
      defaultDiscountTimeYears: 1,
      expectedAccruedOnDefaultYearFraction: 0.125,
    });
  });

  it('makes omission of accrued-on-default explicit', () => {
    const periods = createRegularCdsPeriods({
      termYears: 2,
      paymentFrequency: 2,
      accruedOnDefault: 'none',
    });

    expect(
      periods.every(
        (period) => period.expectedAccruedOnDefaultYearFraction === 0,
      ),
    ).toBe(true);
  });

  it('rejects invalid regular schedules and assumptions', () => {
    expect(() =>
      createRegularCdsPeriods({
        termYears: 0,
        paymentFrequency: 4,
        accruedOnDefault: 'none',
      }),
    ).toThrow(/termYears/);
    expect(() =>
      createRegularCdsPeriods({
        termYears: 1,
        paymentFrequency: 12,
        accruedOnDefault: 'none',
      }),
    ).toThrow(/paymentFrequency/);
    expect(() =>
      createRegularCdsPeriods({
        termYears: 1.3,
        paymentFrequency: 2,
        accruedOnDefault: 'none',
      }),
    ).toThrow(/whole number/);
    expect(() =>
      createRegularCdsPeriods({
        termYears: 1e-12,
        paymentFrequency: 4,
        accruedOnDefault: 'none',
      }),
    ).toThrow(/at least one/);
    expect(() =>
      createRegularCdsPeriods({
        termYears: Number.MAX_VALUE,
        paymentFrequency: 4,
        accruedOnDefault: 'none',
      }),
    ).toThrow(/number of premium periods/);
    expect(() =>
      createRegularCdsPeriods({
        termYears: 1,
        paymentFrequency: 4,
        accruedOnDefault: 'invalid' as AccruedOnDefaultAssumption,
      }),
    ).toThrow(/accruedOnDefault/);
  });
});

describe('CDS premium and protection legs', () => {
  it('matches two-period reference arithmetic and exposes its breakdown', () => {
    const factors = cdsLegFactors(referenceModel());
    const value = valueCdsLegs({
      ...referenceModel(),
      notional: 100,
      annualPremiumRate: 0.03,
    });

    expectRelativeClose(factors.scheduledPremiumAnnuityYears, 0.94585);
    expectRelativeClose(factors.accruedOnDefaultAnnuityYears, 0.012225);
    expectRelativeClose(factors.premiumAnnuityYears, 0.958075);
    expectRelativeClose(factors.protectionLegFactor, 0.02934);
    expectRelativeClose(value.scheduledPremiumPresentValue, 2.83755);
    expectRelativeClose(value.accruedOnDefaultPresentValue, 0.036675);
    expectRelativeClose(value.premiumLegPresentValue, 2.874225);
    expectRelativeClose(value.protectionLegPresentValue, 2.934);
    expectRelativeClose(value.protectionBuyerPresentValue, 0.059775);
    expectRelativeClose(value.parAnnualPremiumRate, 0.030623907314);

    expect(factors.periodValues).toHaveLength(2);
    expect(factors.periodValues[0]).toEqual({
      period: referencePeriods[0],
      scheduledPaymentDiscountFactor: 0.99,
      defaultDiscountFactor: 0.99,
      startSurvivalProbability: 1,
      endSurvivalProbability: 0.98,
      intervalDefaultProbability: 0.020000000000000018,
      scheduledPremiumAnnuityContributionYears: 0.4851,
      accruedOnDefaultAnnuityContributionYears: 0.004950000000000005,
      protectionLegFactorContribution: 0.01188000000000001,
    });
    expectRelativeClose(
      factors.periodValues[1].scheduledPremiumAnnuityContributionYears,
      0.46075,
    );
    expectRelativeClose(
      factors.periodValues[1].accruedOnDefaultAnnuityContributionYears,
      0.007275,
    );
    expectRelativeClose(
      factors.periodValues[1].protectionLegFactorContribution,
      0.01746,
    );
  });

  it('samples each curve only once at each unique time', () => {
    const survivalCalls = new Map<number, number>();
    const discountCalls = new Map<number, number>();
    const model = referenceModel();

    valueCdsLegs({
      ...model,
      notional: 100,
      annualPremiumRate: 0.03,
      survivalProbability: (timeYears) => {
        survivalCalls.set(timeYears, (survivalCalls.get(timeYears) ?? 0) + 1);
        return model.survivalProbability(timeYears);
      },
      discountFactor: (timeYears) => {
        discountCalls.set(timeYears, (discountCalls.get(timeYears) ?? 0) + 1);
        return model.discountFactor(timeYears);
      },
    });

    expect([...survivalCalls.entries()]).toEqual([
      [0, 1],
      [0.5, 1],
      [1, 1],
    ]);
    expect([...discountCalls.entries()]).toEqual([
      [0.5, 1],
      [1, 1],
    ]);
  });

  it('equates the legs and buyer value at the internally reported par rate', () => {
    const model = regularModel();
    const parAnnualPremiumRate = parCdsSpread(model);
    const value = valueCdsLegs({
      ...model,
      notional: 10_000_000,
      annualPremiumRate: parAnnualPremiumRate,
    });

    expectRelativeClose(value.parAnnualPremiumRate, parAnnualPremiumRate);
    expectRelativeClose(
      value.premiumLegPresentValue,
      value.protectionLegPresentValue,
      2e-10,
    );
    expectRelativeClose(value.protectionBuyerPresentValue, 0, 2e-10);
  });

  it('scales with notional and is linear in the running premium rate', () => {
    const model = regularModel();
    const unit = valueCdsLegs({
      ...model,
      notional: 1,
      annualPremiumRate: 0.02,
    });
    const large = valueCdsLegs({
      ...model,
      notional: 1_000,
      annualPremiumRate: 0.02,
    });
    const doubleRate = valueCdsLegs({
      ...model,
      notional: 1,
      annualPremiumRate: 0.04,
    });

    expectRelativeClose(
      large.premiumLegPresentValue,
      1_000 * unit.premiumLegPresentValue,
    );
    expectRelativeClose(
      large.protectionLegPresentValue,
      1_000 * unit.protectionLegPresentValue,
    );
    expectRelativeClose(
      doubleRate.premiumLegPresentValue,
      2 * unit.premiumLegPresentValue,
    );
    expectRelativeClose(
      doubleRate.protectionLegPresentValue,
      unit.protectionLegPresentValue,
    );
    expect(doubleRate.parAnnualPremiumRate).toBe(unit.parAnnualPremiumRate);
  });

  it('is linear in loss given default and reaches zero protection at full recovery', () => {
    const model = regularModel();
    const fortyPercentRecovery = cdsLegFactors(model);
    const eightyPercentRecovery = cdsLegFactors({
      ...model,
      recoveryRate: 0.8,
    });
    const fullRecovery = cdsLegFactors({
      ...model,
      recoveryRate: 1,
    });

    expectRelativeClose(
      eightyPercentRecovery.protectionLegFactor,
      fortyPercentRecovery.protectionLegFactor / 3,
    );
    expect(fullRecovery.protectionLegFactor).toBe(0);
    expect(
      parCdsSpread({
        ...model,
        recoveryRate: 1,
      }),
    ).toBe(0);
    expect(eightyPercentRecovery.premiumAnnuityYears).toBe(
      fortyPercentRecovery.premiumAnnuityYears,
    );
  });

  it('telescopes under flat discounting and has the no-default limit', () => {
    const periods = createRegularCdsPeriods({
      termYears: 4,
      paymentFrequency: 4,
      accruedOnDefault: 'half-period',
    });
    const survivalProbability = constantHazardSurvivalProbability(0.08);
    const factors = cdsLegFactors({
      recoveryRate: 0.35,
      periods,
      discountFactor: () => 1,
      survivalProbability,
    });
    expectRelativeClose(
      factors.protectionLegFactor,
      (1 - 0.35) * (1 - survivalProbability(4)),
    );

    const noDefault = cdsLegFactors({
      recoveryRate: 0.35,
      periods,
      discountFactor: () => 1,
      survivalProbability: () => 1,
    });
    expectRelativeClose(noDefault.scheduledPremiumAnnuityYears, 4);
    expect(noDefault.accruedOnDefaultAnnuityYears).toBe(0);
    expect(noDefault.protectionLegFactor).toBe(0);
    expect(
      parCdsSpread({
        recoveryRate: 0.35,
        periods,
        discountFactor: () => 1,
        survivalProbability: () => 1,
      }),
    ).toBe(0);
  });

  it('shows the separate effects of accrued-on-default and default discount timing', () => {
    const withoutAccrual = cdsLegFactors(regularModel('none'));
    const withAccrual = cdsLegFactors(regularModel('half-period'));

    expect(withAccrual.premiumAnnuityYears).toBeGreaterThan(
      withoutAccrual.premiumAnnuityYears,
    );
    expect(withAccrual.protectionLegFactor).toBe(
      withoutAccrual.protectionLegFactor,
    );
    expect(parCdsSpread(regularModel('half-period'))).toBeLessThan(
      parCdsSpread(regularModel('none')),
    );

    const periodEnd = cdsLegFactors({
      recoveryRate: 0.4,
      periods: [referencePeriods[0]],
      discountFactor: (timeYears) => 1 / (1 + timeYears),
      survivalProbability: (timeYears) => (timeYears === 0 ? 1 : 0.9),
    });
    const midpoint = cdsLegFactors({
      recoveryRate: 0.4,
      periods: [
        {
          ...referencePeriods[0],
          defaultDiscountTimeYears: 0.25,
        },
      ],
      discountFactor: (timeYears) => 1 / (1 + timeYears),
      survivalProbability: (timeYears) => (timeYears === 0 ? 1 : 0.9),
    });
    expect(midpoint.protectionLegFactor).toBeGreaterThan(
      periodEnd.protectionLegFactor,
    );
    expect(midpoint.accruedOnDefaultAnnuityYears).toBeGreaterThan(
      periodEnd.accruedOnDefaultAnnuityYears,
    );
    expect(midpoint.scheduledPremiumAnnuityYears).toBe(
      periodEnd.scheduledPremiumAnnuityYears,
    );
  });

  it('rejects invalid notionals, rates, recoveries, curves, and undefined par spreads', () => {
    const model = regularModel();
    for (const notional of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        valueCdsLegs({
          ...model,
          notional,
          annualPremiumRate: 0.02,
        }),
      ).toThrow(/notional/);
    }
    for (const annualPremiumRate of [
      -0.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() =>
        valueCdsLegs({
          ...model,
          notional: 100,
          annualPremiumRate,
        }),
      ).toThrow(/annualPremiumRate/);
    }
    for (const recoveryRate of [
      -0.01,
      1.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() => cdsLegFactors({ ...model, recoveryRate })).toThrow(
        /recoveryRate/,
      );
    }
    for (const invalidDiscountFactor of [
      -0.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() =>
        cdsLegFactors({
          ...model,
          discountFactor: () => invalidDiscountFactor,
        }),
      ).toThrow(/discountFactor/);
    }
    for (const invalidSurvivalProbability of [
      -0.1,
      1.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() =>
        cdsLegFactors({
          ...model,
          survivalProbability: (timeYears) =>
            timeYears === 0 ? 1 : invalidSurvivalProbability,
        }),
      ).toThrow(/survivalProbability/);
    }
    expect(() =>
      cdsLegFactors({
        ...model,
        survivalProbability: (timeYears) => (timeYears === 0 ? 0.99 : 0.9),
      }),
    ).toThrow(/must equal one/);
    expect(() =>
      cdsLegFactors({
        ...referenceModel(),
        survivalProbability: (timeYears) => {
          if (timeYears === 0) return 1;
          if (timeYears === 0.5) return 0.9;
          return 0.95;
        },
      }),
    ).toThrow(/non-increasing/);

    const zeroAnnuityModel: CdsLegModelInput = {
      recoveryRate: 0.4,
      periods: [
        {
          ...referencePeriods[0],
          expectedAccruedOnDefaultYearFraction: 0,
        },
      ],
      discountFactor: () => 1,
      survivalProbability: (timeYears) => (timeYears === 0 ? 1 : 0),
    };
    expect(() => parCdsSpread(zeroAnnuityModel)).toThrow(/premium annuity/);
    expect(() =>
      valueCdsLegs({
        ...zeroAnnuityModel,
        notional: 100,
        annualPremiumRate: 0.02,
      }),
    ).toThrow(/premium annuity/);

    expect(() =>
      valueCdsLegs({
        ...referenceModel(),
        notional: Number.MAX_VALUE,
        annualPremiumRate: Number.MAX_VALUE,
      }),
    ).toThrow(/finite/);
  });

  it('rejects malformed, noncontiguous, and inconsistent explicit periods', () => {
    const model = referenceModel();
    const valid = referencePeriods[0];
    const invalidPeriods: Array<readonly CdsPeriod[]> = [
      [],
      [{ ...valid, startTimeYears: -0.1 }],
      [{ ...valid, startTimeYears: 0.1 }],
      [{ ...valid, endTimeYears: 0 }],
      [{ ...valid, endTimeYears: Number.NaN }],
      [{ ...valid, paymentTimeYears: 0.4 }],
      [{ ...valid, defaultDiscountTimeYears: -0.1 }],
      [{ ...valid, defaultDiscountTimeYears: 0.6 }],
      [{ ...valid, accrualYearFraction: 0 }],
      [{ ...valid, expectedAccruedOnDefaultYearFraction: -0.1 }],
      [{ ...valid, expectedAccruedOnDefaultYearFraction: 0.6 }],
      [valid, { ...referencePeriods[1], startTimeYears: 0.6 }],
      [
        { ...valid, paymentTimeYears: 2 },
        { ...referencePeriods[1], paymentTimeYears: 1 },
      ],
    ];

    for (const periods of invalidPeriods) {
      expect(() => cdsLegFactors({ ...model, periods })).toThrow();
    }
  });
});
