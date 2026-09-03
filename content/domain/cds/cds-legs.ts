import type { DiscountFactor } from '../present-value';
import {
  finiteNumber,
  nonNegativeNumber,
  paymentFrequency,
  positiveNumber,
  unitIntervalNumber,
} from '../scalars';
import type { SurvivalProbability } from '../credit/survival';

/**
 * One interval in the discrete CDS teaching model.
 *
 * `defaultDiscountTimeYears` is the representative time used to discount all
 * defaults in the interval; it is not an assertion that every default occurs
 * then. `expectedAccruedOnDefaultYearFraction` is the conditional expected
 * premium accrual if default occurs in this interval. Both approximations are
 * inputs so the valuation function does not hide them.
 */
export interface CdsPeriod {
  readonly startTimeYears: number;
  readonly endTimeYears: number;
  readonly paymentTimeYears: number;
  readonly accrualYearFraction: number;
  readonly defaultDiscountTimeYears: number;
  readonly expectedAccruedOnDefaultYearFraction: number;
}

export type AccruedOnDefaultAssumption = 'none' | 'half-period';

export interface RegularCdsPeriodsInput {
  readonly termYears: number;
  readonly paymentFrequency: number;
  readonly accruedOnDefault: AccruedOnDefaultAssumption;
}

export interface CdsLegModelInput {
  /** Recovery as a fraction of notional, in [0,1]. */
  readonly recoveryRate: number;
  readonly periods: readonly CdsPeriod[];
  readonly discountFactor: DiscountFactor;
  readonly survivalProbability: SurvivalProbability;
}

export interface CdsLegValuationInput extends CdsLegModelInput {
  /** Positive notional in currency units. */
  readonly notional: number;
  /** Annual running premium rate in decimal units; 0.01 is 100 bp. */
  readonly annualPremiumRate: number;
}

export interface CdsLegFactors {
  /** PV per unit notional and per unit annual premium rate. */
  readonly scheduledPremiumAnnuityYears: number;
  /** PV per unit notional and per unit annual premium rate. */
  readonly accruedOnDefaultAnnuityYears: number;
  /** Sum of scheduled and accrued-on-default annuities. */
  readonly premiumAnnuityYears: number;
  /** Protection-leg PV per unit notional, including loss given default. */
  readonly protectionLegFactor: number;
  /** Auditable inputs and contributions for each explicit model period. */
  readonly periodValues: readonly CdsPeriodFactors[];
}

export interface CdsPeriodFactors {
  readonly period: CdsPeriod;
  readonly scheduledPaymentDiscountFactor: number;
  readonly defaultDiscountFactor: number;
  readonly startSurvivalProbability: number;
  readonly endSurvivalProbability: number;
  readonly intervalDefaultProbability: number;
  readonly scheduledPremiumAnnuityContributionYears: number;
  readonly accruedOnDefaultAnnuityContributionYears: number;
  readonly protectionLegFactorContribution: number;
}

export interface CdsLegPresentValues extends CdsLegFactors {
  /** Annual decimal rate that equates these sampled premium and protection legs. */
  readonly parAnnualPremiumRate: number;
  /** Non-negative payment magnitude from the protection buyer. */
  readonly scheduledPremiumPresentValue: number;
  /** Non-negative payment magnitude from the protection buyer. */
  readonly accruedOnDefaultPresentValue: number;
  /** Non-negative total payment magnitude from the protection buyer. */
  readonly premiumLegPresentValue: number;
  /** Non-negative receipt magnitude for the protection buyer. */
  readonly protectionLegPresentValue: number;
  /** Protection receipt less premium payment. */
  readonly protectionBuyerPresentValue: number;
}

/**
 * Builds equal model-year CDS periods without calendar dates, day counts, or
 * stubs. Scheduled premiums and the representative default cash flow are both
 * placed at each period end. The caller must explicitly include no accrued
 * premium on default or the half-period conditional-expectation approximation.
 */
export function createRegularCdsPeriods(
  input: RegularCdsPeriodsInput,
): readonly CdsPeriod[] {
  const termYears = positiveNumber(input.termYears, 'termYears');
  const frequency = paymentFrequency(input.paymentFrequency);
  const rawNumberOfPeriods = finiteNumber(
    termYears * frequency,
    'number of premium periods',
  );
  const numberOfPeriods = Math.round(rawNumberOfPeriods);

  if (Math.abs(rawNumberOfPeriods - numberOfPeriods) > 1e-10) {
    throw new RangeError(
      'termYears must contain a whole number of premium periods',
    );
  }
  if (!Number.isSafeInteger(numberOfPeriods)) {
    throw new RangeError('number of premium periods must be a safe integer');
  }
  if (numberOfPeriods < 1) {
    throw new RangeError('number of premium periods must be at least one');
  }

  if (
    input.accruedOnDefault !== 'none' &&
    input.accruedOnDefault !== 'half-period'
  ) {
    throw new RangeError('accruedOnDefault must be "none" or "half-period"');
  }

  const accrualYearFraction = 1 / frequency;
  const expectedAccruedOnDefaultYearFraction =
    input.accruedOnDefault === 'half-period' ? accrualYearFraction / 2 : 0;

  return Array.from({ length: numberOfPeriods }, (_, index) => {
    const startTimeYears = index / frequency;
    const endTimeYears = (index + 1) / frequency;
    return {
      startTimeYears,
      endTimeYears,
      paymentTimeYears: endTimeYears,
      accrualYearFraction,
      defaultDiscountTimeYears: endTimeYears,
      expectedAccruedOnDefaultYearFraction,
    };
  });
}

/**
 * Calculates the discrete premium-annuity and protection factors. Model
 * survival at valuation is one, S(0)=1. Scheduled premium is conditional on
 * survival to each period end. Defaults inside a period use the period's
 * explicitly supplied representative discount time and expected accrual.
 */
export function cdsLegFactors(input: CdsLegModelInput): CdsLegFactors {
  const recoveryRate = unitIntervalNumber(input.recoveryRate, 'recoveryRate');
  validatePeriods(input.periods);

  const survivalAt = sampledSurvivalProbability(input.survivalProbability);
  const survivalAtValuation = survivalAt(0);
  if (survivalAtValuation !== 1) {
    throw new RangeError('survivalProbability(0) must equal one');
  }

  const discountAt = sampledDiscountFactor(input.discountFactor);
  const periodValues: CdsPeriodFactors[] = [];
  let previousSurvival = survivalAtValuation;

  for (const [index, period] of input.periods.entries()) {
    const startSurvival = survivalAt(period.startTimeYears);
    const endSurvival = survivalAt(period.endTimeYears);

    if (startSurvival > previousSurvival) {
      throw new RangeError(
        `survivalProbability must be non-increasing before periods[${index}]`,
      );
    }
    if (endSurvival > startSurvival) {
      throw new RangeError(
        `survivalProbability must be non-increasing in periods[${index}]`,
      );
    }

    const defaultProbability = nonNegativeNumber(
      startSurvival - endSurvival,
      `default probability in periods[${index}]`,
    );
    const scheduledPaymentDiscountFactor = discountAt(period.paymentTimeYears);
    const defaultDiscountFactor = discountAt(period.defaultDiscountTimeYears);
    const scheduledPremiumAnnuityContributionYears = finiteNumber(
      period.accrualYearFraction * endSurvival * scheduledPaymentDiscountFactor,
      `scheduled premium annuity contribution in periods[${index}]`,
    );
    const accruedOnDefaultAnnuityContributionYears = finiteNumber(
      period.expectedAccruedOnDefaultYearFraction *
        defaultProbability *
        defaultDiscountFactor,
      `accrued-on-default annuity contribution in periods[${index}]`,
    );
    const protectionLegFactorContribution = finiteNumber(
      (1 - recoveryRate) * defaultProbability * defaultDiscountFactor,
      `protection factor contribution in periods[${index}]`,
    );

    periodValues.push({
      period: { ...period },
      scheduledPaymentDiscountFactor,
      defaultDiscountFactor,
      startSurvivalProbability: startSurvival,
      endSurvivalProbability: endSurvival,
      intervalDefaultProbability: defaultProbability,
      scheduledPremiumAnnuityContributionYears,
      accruedOnDefaultAnnuityContributionYears,
      protectionLegFactorContribution,
    });

    previousSurvival = endSurvival;
  }

  const scheduledPremiumAnnuityYears = compensatedFiniteSum(
    periodValues.map(
      (period) => period.scheduledPremiumAnnuityContributionYears,
    ),
    'scheduled premium annuity',
  );
  const accruedOnDefaultAnnuityYears = compensatedFiniteSum(
    periodValues.map(
      (period) => period.accruedOnDefaultAnnuityContributionYears,
    ),
    'accrued-on-default annuity',
  );
  const premiumAnnuityYears = finiteNumber(
    scheduledPremiumAnnuityYears + accruedOnDefaultAnnuityYears,
    'premium annuity',
  );
  const protectionLegFactor = compensatedFiniteSum(
    periodValues.map((period) => period.protectionLegFactorContribution),
    'protection leg factor',
  );

  return {
    scheduledPremiumAnnuityYears,
    accruedOnDefaultAnnuityYears,
    premiumAnnuityYears,
    protectionLegFactor,
    periodValues,
  };
}

/** Returns the annual decimal running rate that equates the two leg PVs. */
export function parCdsSpread(input: CdsLegModelInput): number {
  return parAnnualPremiumRateFromFactors(cdsLegFactors(input));
}

/**
 * Returns positive leg magnitudes and a signed protection-buyer value. This is
 * a running-spread-only model: no upfront amount is included.
 */
export function valueCdsLegs(input: CdsLegValuationInput): CdsLegPresentValues {
  const notional = positiveNumber(input.notional, 'notional');
  const annualPremiumRate = nonNegativeNumber(
    input.annualPremiumRate,
    'annualPremiumRate',
  );
  const factors = cdsLegFactors(input);
  const parAnnualPremiumRate = parAnnualPremiumRateFromFactors(factors);

  const scheduledPremiumPresentValue = finiteNumber(
    notional * annualPremiumRate * factors.scheduledPremiumAnnuityYears,
    'scheduled premium present value',
  );
  const accruedOnDefaultPresentValue = finiteNumber(
    notional * annualPremiumRate * factors.accruedOnDefaultAnnuityYears,
    'accrued-on-default present value',
  );
  const premiumLegPresentValue = finiteNumber(
    scheduledPremiumPresentValue + accruedOnDefaultPresentValue,
    'premium leg present value',
  );
  const protectionLegPresentValue = finiteNumber(
    notional * factors.protectionLegFactor,
    'protection leg present value',
  );
  const protectionBuyerPresentValue = finiteNumber(
    protectionLegPresentValue - premiumLegPresentValue,
    'protection buyer present value',
  );

  return {
    ...factors,
    parAnnualPremiumRate,
    scheduledPremiumPresentValue,
    accruedOnDefaultPresentValue,
    premiumLegPresentValue,
    protectionLegPresentValue,
    protectionBuyerPresentValue,
  };
}

function parAnnualPremiumRateFromFactors(factors: CdsLegFactors): number {
  positiveNumber(factors.premiumAnnuityYears, 'premium annuity for par spread');
  return finiteNumber(
    factors.protectionLegFactor / factors.premiumAnnuityYears,
    'par CDS spread',
  );
}

function validatePeriods(periods: readonly CdsPeriod[]): void {
  if (periods.length === 0) {
    throw new RangeError('periods must contain at least one CDS period');
  }

  let previousEndTimeYears = 0;
  let previousPaymentTimeYears = -1;

  for (const [index, period] of periods.entries()) {
    const label = `periods[${index}]`;
    const startTimeYears = nonNegativeNumber(
      period.startTimeYears,
      `${label}.startTimeYears`,
    );
    const endTimeYears = nonNegativeNumber(
      period.endTimeYears,
      `${label}.endTimeYears`,
    );
    const paymentTimeYears = nonNegativeNumber(
      period.paymentTimeYears,
      `${label}.paymentTimeYears`,
    );
    const accrualYearFraction = positiveNumber(
      period.accrualYearFraction,
      `${label}.accrualYearFraction`,
    );
    const defaultDiscountTimeYears = nonNegativeNumber(
      period.defaultDiscountTimeYears,
      `${label}.defaultDiscountTimeYears`,
    );
    const expectedAccruedOnDefaultYearFraction = nonNegativeNumber(
      period.expectedAccruedOnDefaultYearFraction,
      `${label}.expectedAccruedOnDefaultYearFraction`,
    );

    if (startTimeYears !== previousEndTimeYears) {
      throw new RangeError(
        `${label}.startTimeYears must equal the previous period end`,
      );
    }
    if (endTimeYears <= startTimeYears) {
      throw new RangeError(`${label}.endTimeYears must be after its start`);
    }
    if (paymentTimeYears < endTimeYears) {
      throw new RangeError(
        `${label}.paymentTimeYears must be at or after its end`,
      );
    }
    if (paymentTimeYears <= previousPaymentTimeYears) {
      throw new RangeError(
        `${label}.paymentTimeYears must be later than the previous payment`,
      );
    }
    if (
      defaultDiscountTimeYears < startTimeYears ||
      defaultDiscountTimeYears > endTimeYears
    ) {
      throw new RangeError(
        `${label}.defaultDiscountTimeYears must be inside its interval`,
      );
    }
    if (expectedAccruedOnDefaultYearFraction > accrualYearFraction) {
      throw new RangeError(
        `${label}.expectedAccruedOnDefaultYearFraction must not exceed its accrualYearFraction`,
      );
    }

    previousEndTimeYears = endTimeYears;
    previousPaymentTimeYears = paymentTimeYears;
  }
}

function sampledSurvivalProbability(
  survivalProbability: SurvivalProbability,
): SurvivalProbability {
  const samples = new Map<number, number>();
  return (timeYears) => {
    const cached = samples.get(timeYears);
    if (cached !== undefined) {
      return cached;
    }
    const value = unitIntervalNumber(
      survivalProbability(timeYears),
      `survivalProbability(${timeYears})`,
    );
    samples.set(timeYears, value);
    return value;
  };
}

function sampledDiscountFactor(discountFactor: DiscountFactor): DiscountFactor {
  const samples = new Map<number, number>();
  return (timeYears) => {
    const cached = samples.get(timeYears);
    if (cached !== undefined) {
      return cached;
    }
    const value = nonNegativeNumber(
      discountFactor(timeYears),
      `discountFactor(${timeYears})`,
    );
    samples.set(timeYears, value);
    return value;
  };
}

function compensatedFiniteSum(
  values: readonly number[],
  label: string,
): number {
  let sum = 0;
  let correction = 0;

  for (const value of values) {
    const adjusted = value - correction;
    const next = sum + adjusted;
    correction = next - sum - adjusted;
    sum = next;
  }

  return finiteNumber(sum, label);
}
