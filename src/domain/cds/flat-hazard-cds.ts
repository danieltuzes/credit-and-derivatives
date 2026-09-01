import {
  finiteNumber,
  nonNegativeNumber,
  paymentFrequency,
  positiveNumber,
  unitIntervalNumber,
} from '../scalars';

const MAX_REGULAR_PERIODS = 10_000;
const MAX_SOLVER_HAZARD_RATE_PER_YEAR = 1_000_000;
const ROOT_FUNCTION_TOLERANCE = 1e-14;
const ROOT_RATE_TOLERANCE = 1e-12;
const ROOT_MAX_ITERATIONS = 200;

/**
 * Parameters for a deliberately simplified CDS model.
 *
 * Time is measured in model years from valuation time zero. Rates are decimal
 * rates per model year. The risk-free rate is continuously compounded and may
 * be negative. The hazard rate is a non-negative, constant risk-neutral
 * intensity. Recovery is a deterministic fraction of notional. The schedule
 * has equal annual, semiannual, or quarterly periods and no calendar dates,
 * stubs, day-count rules, settlement lag, or front-end protection.
 */
export interface SimplifiedFlatHazardCdsModelInput {
  readonly termYears: number;
  readonly paymentFrequency: number;
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly constantRiskNeutralHazardRatePerYear: number;
  readonly recoveryRate: number;
}

export interface SimplifiedFlatHazardCdsValuationInput extends SimplifiedFlatHazardCdsModelInput {
  /** Positive notional in currency units. */
  readonly notional: number;
  /** Fixed running coupon as an annual decimal rate; 0.01 is 100 bp/year. */
  readonly fixedCouponAnnualRate: number;
}

export interface SimplifiedFlatHazardCdsPeriodContribution {
  /** One-based period number. */
  readonly periodNumber: number;
  readonly startTimeYears: number;
  readonly endTimeYears: number;
  readonly accrualYearFraction: number;
  readonly discountFactorAtPayment: number;
  readonly survivalProbabilityAtPeriodStart: number;
  readonly survivalProbabilityAtPeriodEnd: number;
  readonly intervalRiskNeutralDefaultProbability: number;
  /**
   * D(t_i) S(t_i) for the premium paid at the period end conditional on
   * survival. This is not a probability when the risk-free rate is non-zero.
   */
  readonly discountedSurvivalFactorAtPayment: number;
  /** PV per unit notional and per unit annual coupon rate, in model years. */
  readonly scheduledPremiumAnnuityContributionYears: number;
  /**
   * Integral of accrued time times discounted risk-neutral default density,
   * in model years, for default at its actual time inside this period.
   */
  readonly accruedOnDefaultAnnuityContributionYears: number;
  /** Integral of discounted risk-neutral default density in this period. */
  readonly discountedDefaultProbabilityContribution: number;
  /** Discounted default contribution multiplied by loss given default. */
  readonly protectionLegFactorContribution: number;
}

export interface SimplifiedFlatHazardCdsLegFactors {
  /** PV per unit notional and unit annual coupon, in model years. */
  readonly scheduledPremiumAnnuityYears: number;
  /** PV per unit notional and unit annual coupon, in model years. */
  readonly accruedOnDefaultAnnuityYears: number;
  /** Sum of scheduled and accrued-on-default annuities, in model years. */
  readonly premiumAnnuityYears: number;
  /** PV of protection per unit notional, including loss given default. */
  readonly protectionLegFactor: number;
  /** Annual decimal running rate that equates the two legs without upfront. */
  readonly parSpreadAnnualRate: number;
  readonly periodContributions: readonly SimplifiedFlatHazardCdsPeriodContribution[];
}

export interface SimplifiedFlatHazardCdsValuation extends SimplifiedFlatHazardCdsLegFactors {
  readonly notional: number;
  readonly fixedCouponAnnualRate: number;
  /** Non-negative currency amount paid by the protection buyer over time. */
  readonly scheduledPremiumPresentValue: number;
  /** Non-negative currency amount paid by the buyer upon default. */
  readonly accruedOnDefaultPresentValue: number;
  /** Scheduled plus accrued-on-default premium PV. */
  readonly premiumLegPresentValue: number;
  /** Non-negative currency receipt magnitude for the protection buyer. */
  readonly protectionLegPresentValue: number;
  /** Protection receipt less running-premium payments, before upfront. */
  readonly protectionBuyerPresentValueBeforeUpfront: number;
  /**
   * Signed fraction of notional paid at time zero by the protection buyer.
   * Positive means the buyer pays; negative means the buyer receives.
   */
  readonly fairUpfrontFractionPaidByProtectionBuyer: number;
  /**
   * Signed currency amount paid at time zero by the protection buyer. It is
   * exactly protection-leg PV less premium-leg PV in this model.
   */
  readonly fairUpfrontAmountPaidByProtectionBuyer: number;
  /** Protection minus premium minus the fair upfront; zero up to arithmetic. */
  readonly protectionBuyerPresentValueAfterFairUpfront: number;
}

interface SimplifiedFlatHazardCdsQuoteBaseInput {
  readonly termYears: number;
  readonly paymentFrequency: number;
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly recoveryRate: number;
  readonly notional: number;
  readonly fixedCouponAnnualRate: number;
}

export interface SimplifiedFlatHazardQuoteToUpfrontInput extends SimplifiedFlatHazardCdsQuoteBaseInput {
  /**
   * Annual decimal par-spread quote. In this teaching conversion it is the par
   * spread used to infer one constant risk-neutral hazard rate.
   */
  readonly marketStandardQuoteAnnualRate: number;
}

export interface SimplifiedFlatHazardQuoteToUpfrontResult extends SimplifiedFlatHazardCdsValuation {
  readonly marketStandardQuoteAnnualRate: number;
  readonly impliedRiskNeutralHazardRatePerYear: number;
}

export interface SimplifiedFlatHazardUpfrontToQuoteInput extends SimplifiedFlatHazardCdsQuoteBaseInput {
  /**
   * Signed currency amount at time zero: positive when paid by the protection
   * buyer and negative when received by the protection buyer.
   */
  readonly upfrontAmountPaidByProtectionBuyer: number;
}

export interface SimplifiedFlatHazardUpfrontToQuoteResult extends SimplifiedFlatHazardCdsValuation {
  readonly inputUpfrontAmountPaidByProtectionBuyer: number;
  readonly marketStandardQuoteAnnualRate: number;
  readonly impliedRiskNeutralHazardRatePerYear: number;
}

/**
 * Values the two CDS legs by analytic expectation under the model above.
 *
 * Scheduled premium in period i is paid at t_i only on survival. If default
 * occurs at tau in (t_{i-1}, t_i], accrued premium proportional to
 * tau-t_{i-1} and protection proportional to 1-recovery are both paid at tau.
 * The continuous default density is lambda exp(-lambda tau), so the default
 * cash flows are integrated over every possible tau rather than assigned to a
 * representative midpoint or period end.
 */
export function simplifiedFlatHazardCdsLegFactors(
  input: SimplifiedFlatHazardCdsModelInput,
): SimplifiedFlatHazardCdsLegFactors {
  const validated = validateModelInput(input);
  const {
    numberOfPeriods,
    accrualYearFraction,
    continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
    constantRiskNeutralHazardRatePerYear: hazardRate,
    recoveryRate,
  } = validated;
  const lossGivenDefault = 1 - recoveryRate;
  const jointRate = finiteNumber(
    riskFreeRate + hazardRate,
    'risk-free rate plus hazard rate',
  );
  const periodContributions: SimplifiedFlatHazardCdsPeriodContribution[] = [];

  for (let index = 0; index < numberOfPeriods; index += 1) {
    const periodNumber = index + 1;
    const startTimeYears = index * accrualYearFraction;
    const endTimeYears = periodNumber * accrualYearFraction;
    const riskFreeExponent = finiteNumber(
      -riskFreeRate * endTimeYears,
      `risk-free exponent in period ${periodNumber}`,
    );
    const startHazardExponent = finiteNumber(
      -hazardRate * startTimeYears,
      `start hazard exponent in period ${periodNumber}`,
    );
    const endHazardExponent = finiteNumber(
      -hazardRate * endTimeYears,
      `end hazard exponent in period ${periodNumber}`,
    );
    const jointPaymentExponent = finiteNumber(
      -jointRate * endTimeYears,
      `discounted-survival exponent in period ${periodNumber}`,
    );
    const jointStartExponent = finiteNumber(
      -jointRate * startTimeYears,
      `joint start exponent in period ${periodNumber}`,
    );

    const discountFactorAtPayment = finiteExponential(
      riskFreeExponent,
      `discount factor in period ${periodNumber}`,
    );
    const survivalProbabilityAtPeriodStart = finiteExponential(
      startHazardExponent,
      `start survival probability in period ${periodNumber}`,
    );
    const survivalProbabilityAtPeriodEnd = finiteExponential(
      endHazardExponent,
      `end survival probability in period ${periodNumber}`,
    );
    const hazardOverPeriod = finiteNumber(
      hazardRate * accrualYearFraction,
      `hazard times accrual in period ${periodNumber}`,
    );
    const intervalRiskNeutralDefaultProbability = finiteNumber(
      survivalProbabilityAtPeriodStart * -Math.expm1(-hazardOverPeriod),
      `default probability in period ${periodNumber}`,
    );
    const discountedSurvivalFactorAtPayment = finiteExponential(
      jointPaymentExponent,
      `discounted survival factor in period ${periodNumber}`,
    );
    const scheduledPremiumAnnuityContributionYears = finiteNumber(
      accrualYearFraction * discountedSurvivalFactorAtPayment,
      `scheduled premium annuity in period ${periodNumber}`,
    );

    let accruedOnDefaultAnnuityContributionYears = 0;
    let discountedDefaultProbabilityContribution = 0;
    if (hazardRate > 0) {
      const discountedJointSurvivalAtPeriodStart = finiteExponential(
        jointStartExponent,
        `joint start factor in period ${periodNumber}`,
      );
      discountedDefaultProbabilityContribution = finiteNumber(
        hazardRate *
          discountedJointSurvivalAtPeriodStart *
          exponentialIntegralZeroMoment(jointRate, accrualYearFraction),
        `discounted default probability in period ${periodNumber}`,
      );
      accruedOnDefaultAnnuityContributionYears = finiteNumber(
        hazardRate *
          discountedJointSurvivalAtPeriodStart *
          exponentialIntegralFirstMoment(jointRate, accrualYearFraction),
        `accrued-on-default annuity in period ${periodNumber}`,
      );
    }
    const protectionLegFactorContribution = finiteNumber(
      lossGivenDefault * discountedDefaultProbabilityContribution,
      `protection leg factor in period ${periodNumber}`,
    );

    periodContributions.push({
      periodNumber,
      startTimeYears,
      endTimeYears,
      accrualYearFraction,
      discountFactorAtPayment,
      survivalProbabilityAtPeriodStart,
      survivalProbabilityAtPeriodEnd,
      intervalRiskNeutralDefaultProbability,
      discountedSurvivalFactorAtPayment,
      scheduledPremiumAnnuityContributionYears,
      accruedOnDefaultAnnuityContributionYears,
      discountedDefaultProbabilityContribution,
      protectionLegFactorContribution,
    });
  }

  const scheduledPremiumAnnuityYears = compensatedFiniteSum(
    periodContributions.map(
      (period) => period.scheduledPremiumAnnuityContributionYears,
    ),
    'scheduled premium annuity',
  );
  const accruedOnDefaultAnnuityYears = compensatedFiniteSum(
    periodContributions.map(
      (period) => period.accruedOnDefaultAnnuityContributionYears,
    ),
    'accrued-on-default annuity',
  );
  const premiumAnnuityYears = positiveNumber(
    scheduledPremiumAnnuityYears + accruedOnDefaultAnnuityYears,
    'premium annuity',
  );
  const protectionLegFactor = compensatedFiniteSum(
    periodContributions.map((period) => period.protectionLegFactorContribution),
    'protection leg factor',
  );
  const parSpreadAnnualRate = finiteNumber(
    protectionLegFactor / premiumAnnuityYears,
    'par spread',
  );

  return {
    scheduledPremiumAnnuityYears,
    accruedOnDefaultAnnuityYears,
    premiumAnnuityYears,
    protectionLegFactor,
    parSpreadAnnualRate,
    periodContributions,
  };
}

/** Returns the annual decimal running spread that equates the two leg PVs. */
export function simplifiedFlatHazardParSpread(
  input: SimplifiedFlatHazardCdsModelInput,
): number {
  return simplifiedFlatHazardCdsLegFactors(input).parSpreadAnnualRate;
}

/**
 * Returns positive leg magnitudes and the signed time-zero upfront that makes
 * the protection buyer's value zero for the supplied fixed running coupon.
 */
export function valueSimplifiedFlatHazardCds(
  input: SimplifiedFlatHazardCdsValuationInput,
): SimplifiedFlatHazardCdsValuation {
  const notional = positiveNumber(input.notional, 'notional');
  const fixedCouponAnnualRate = nonNegativeNumber(
    input.fixedCouponAnnualRate,
    'fixedCouponAnnualRate',
  );
  const factors = simplifiedFlatHazardCdsLegFactors(input);
  const scheduledPremiumPresentValue = finiteNumber(
    notional * fixedCouponAnnualRate * factors.scheduledPremiumAnnuityYears,
    'scheduled premium present value',
  );
  const accruedOnDefaultPresentValue = finiteNumber(
    notional * fixedCouponAnnualRate * factors.accruedOnDefaultAnnuityYears,
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
  const protectionBuyerPresentValueBeforeUpfront = finiteNumber(
    protectionLegPresentValue - premiumLegPresentValue,
    'protection buyer present value before upfront',
  );
  const fairUpfrontAmountPaidByProtectionBuyer =
    protectionBuyerPresentValueBeforeUpfront;
  const fairUpfrontFractionPaidByProtectionBuyer = finiteNumber(
    fairUpfrontAmountPaidByProtectionBuyer / notional,
    'fair upfront fraction paid by protection buyer',
  );
  const protectionBuyerPresentValueAfterFairUpfront = finiteNumber(
    protectionBuyerPresentValueBeforeUpfront -
      fairUpfrontAmountPaidByProtectionBuyer,
    'protection buyer present value after fair upfront',
  );

  return {
    ...factors,
    notional,
    fixedCouponAnnualRate,
    scheduledPremiumPresentValue,
    accruedOnDefaultPresentValue,
    premiumLegPresentValue,
    protectionLegPresentValue,
    protectionBuyerPresentValueBeforeUpfront,
    fairUpfrontFractionPaidByProtectionBuyer,
    fairUpfrontAmountPaidByProtectionBuyer,
    protectionBuyerPresentValueAfterFairUpfront,
  };
}

/**
 * Simplified teaching conversion from a market-standard/par-spread quote to a
 * signed upfront. It infers one flat risk-neutral hazard rate by root solving,
 * then values the supplied fixed coupon at that same hazard rate.
 *
 * This is not an ISDA-standard-model implementation and must not be presented
 * as an executable market quote conversion.
 */
export function simplifiedFlatHazardQuoteToUpfront(
  input: SimplifiedFlatHazardQuoteToUpfrontInput,
): SimplifiedFlatHazardQuoteToUpfrontResult {
  const marketStandardQuoteAnnualRate = nonNegativeNumber(
    input.marketStandardQuoteAnnualRate,
    'marketStandardQuoteAnnualRate',
  );
  validateQuoteBaseInput(input);
  requireLossGivenDefaultForQuoteConversion(input.recoveryRate);

  const impliedRiskNeutralHazardRatePerYear =
    marketStandardQuoteAnnualRate === 0
      ? 0
      : solveNonNegativeIncreasingRate({
          target: marketStandardQuoteAnnualRate,
          valueAtRate: (hazardRate) =>
            simplifiedFlatHazardParSpread({
              ...quoteBaseToModel(input),
              constantRiskNeutralHazardRatePerYear: hazardRate,
            }),
          label: 'marketStandardQuoteAnnualRate',
          initialUpperRate: Math.max(
            0.01,
            (2 * marketStandardQuoteAnnualRate) / (1 - input.recoveryRate),
          ),
        });
  const valuation = valueSimplifiedFlatHazardCds({
    ...quoteBaseToModel(input),
    constantRiskNeutralHazardRatePerYear: impliedRiskNeutralHazardRatePerYear,
    notional: input.notional,
    fixedCouponAnnualRate: input.fixedCouponAnnualRate,
  });

  return {
    ...valuation,
    marketStandardQuoteAnnualRate,
    impliedRiskNeutralHazardRatePerYear,
  };
}

/**
 * Inverse of the simplified quote-to-upfront teaching conversion. It solves
 * for the non-negative flat hazard rate whose signed upfront matches the input,
 * then reports the par spread generated by that hazard rate.
 *
 * Positive upfront means paid by the protection buyer; negative means received
 * by the protection buyer. This is not an ISDA-standard-model conversion.
 */
export function simplifiedFlatHazardUpfrontToQuote(
  input: SimplifiedFlatHazardUpfrontToQuoteInput,
): SimplifiedFlatHazardUpfrontToQuoteResult {
  const upfrontAmountPaidByProtectionBuyer = finiteNumber(
    input.upfrontAmountPaidByProtectionBuyer,
    'upfrontAmountPaidByProtectionBuyer',
  );
  const validatedBase = validateQuoteBaseInput(input);
  requireLossGivenDefaultForQuoteConversion(input.recoveryRate);
  const upfrontFraction = finiteNumber(
    upfrontAmountPaidByProtectionBuyer / validatedBase.notional,
    'upfront fraction paid by protection buyer',
  );
  const modelAtZeroHazard: SimplifiedFlatHazardCdsValuationInput = {
    ...quoteBaseToModel(input),
    constantRiskNeutralHazardRatePerYear: 0,
    notional: validatedBase.notional,
    fixedCouponAnnualRate: validatedBase.fixedCouponAnnualRate,
  };
  const minimumUpfrontFraction =
    valueSimplifiedFlatHazardCds(
      modelAtZeroHazard,
    ).fairUpfrontFractionPaidByProtectionBuyer;
  const maximumUpfrontFraction = 1 - input.recoveryRate;

  if (upfrontFraction < minimumUpfrontFraction - ROOT_FUNCTION_TOLERANCE) {
    throw new RangeError(
      'upfrontAmountPaidByProtectionBuyer is below the zero-hazard lower bound',
    );
  }
  if (upfrontFraction >= maximumUpfrontFraction) {
    throw new RangeError(
      'upfrontAmountPaidByProtectionBuyer must be below the loss-given-default upper bound',
    );
  }

  const impliedRiskNeutralHazardRatePerYear =
    Math.abs(upfrontFraction - minimumUpfrontFraction) <=
    ROOT_FUNCTION_TOLERANCE
      ? 0
      : solveNonNegativeIncreasingRate({
          target: upfrontFraction,
          valueAtRate: (hazardRate) =>
            valueSimplifiedFlatHazardCds({
              ...quoteBaseToModel(input),
              constantRiskNeutralHazardRatePerYear: hazardRate,
              notional: 1,
              fixedCouponAnnualRate: validatedBase.fixedCouponAnnualRate,
            }).fairUpfrontFractionPaidByProtectionBuyer,
          label: 'upfrontAmountPaidByProtectionBuyer',
          initialUpperRate: 0.01,
        });
  const valuation = valueSimplifiedFlatHazardCds({
    ...quoteBaseToModel(input),
    constantRiskNeutralHazardRatePerYear: impliedRiskNeutralHazardRatePerYear,
    notional: validatedBase.notional,
    fixedCouponAnnualRate: validatedBase.fixedCouponAnnualRate,
  });

  return {
    ...valuation,
    inputUpfrontAmountPaidByProtectionBuyer: upfrontAmountPaidByProtectionBuyer,
    marketStandardQuoteAnnualRate: valuation.parSpreadAnnualRate,
    impliedRiskNeutralHazardRatePerYear,
  };
}

interface ValidatedModelInput {
  readonly numberOfPeriods: number;
  readonly accrualYearFraction: number;
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly constantRiskNeutralHazardRatePerYear: number;
  readonly recoveryRate: number;
}

function validateModelInput(
  input: SimplifiedFlatHazardCdsModelInput,
): ValidatedModelInput {
  const termYears = positiveNumber(input.termYears, 'termYears');
  const frequency = paymentFrequency(input.paymentFrequency);
  const riskFreeRate = finiteNumber(
    input.continuouslyCompoundedRiskFreeRatePerYear,
    'continuouslyCompoundedRiskFreeRatePerYear',
  );
  const hazardRate = nonNegativeNumber(
    input.constantRiskNeutralHazardRatePerYear,
    'constantRiskNeutralHazardRatePerYear',
  );
  const recoveryRate = unitIntervalNumber(input.recoveryRate, 'recoveryRate');
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
  if (!Number.isSafeInteger(numberOfPeriods) || numberOfPeriods < 1) {
    throw new RangeError(
      'number of premium periods must be a positive safe integer',
    );
  }
  if (numberOfPeriods > MAX_REGULAR_PERIODS) {
    throw new RangeError(
      `number of premium periods must not exceed ${MAX_REGULAR_PERIODS}`,
    );
  }

  return {
    numberOfPeriods,
    accrualYearFraction: 1 / frequency,
    continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
    constantRiskNeutralHazardRatePerYear: hazardRate,
    recoveryRate,
  };
}

function validateQuoteBaseInput(input: SimplifiedFlatHazardCdsQuoteBaseInput): {
  readonly notional: number;
  readonly fixedCouponAnnualRate: number;
} {
  const notional = positiveNumber(input.notional, 'notional');
  const fixedCouponAnnualRate = nonNegativeNumber(
    input.fixedCouponAnnualRate,
    'fixedCouponAnnualRate',
  );
  validateModelInput({
    ...quoteBaseToModel(input),
    constantRiskNeutralHazardRatePerYear: 0,
  });
  return { notional, fixedCouponAnnualRate };
}

function quoteBaseToModel(
  input: SimplifiedFlatHazardCdsQuoteBaseInput,
): Omit<
  SimplifiedFlatHazardCdsModelInput,
  'constantRiskNeutralHazardRatePerYear'
> {
  return {
    termYears: input.termYears,
    paymentFrequency: input.paymentFrequency,
    continuouslyCompoundedRiskFreeRatePerYear:
      input.continuouslyCompoundedRiskFreeRatePerYear,
    recoveryRate: input.recoveryRate,
  };
}

function requireLossGivenDefaultForQuoteConversion(recoveryRate: number): void {
  if (recoveryRate === 1) {
    throw new RangeError(
      'recoveryRate must be below one for a quote conversion to identify hazard',
    );
  }
}

/** Integral from 0 to delta of exp(-rate * u) du. */
function exponentialIntegralZeroMoment(rate: number, delta: number): number {
  const x = finiteNumber(rate * delta, 'integrated rate over one period');
  if (Math.abs(x) < 1e-8) {
    const x2 = x * x;
    const scaled = 1 - x / 2 + x2 / 6 - (x2 * x) / 24 + (x2 * x2) / 120;
    return finiteNumber(delta * scaled, 'zero-moment exponential integral');
  }
  return finiteNumber(
    delta * (-Math.expm1(-x) / x),
    'zero-moment exponential integral',
  );
}

/** Integral from 0 to delta of u exp(-rate * u) du. */
function exponentialIntegralFirstMoment(rate: number, delta: number): number {
  const x = finiteNumber(rate * delta, 'integrated rate over one period');
  let scaled: number;
  if (Math.abs(x) < 0.05) {
    const x2 = x * x;
    const x3 = x2 * x;
    const x4 = x2 * x2;
    const x5 = x4 * x;
    const x6 = x3 * x3;
    scaled =
      1 / 2 - x / 3 + x2 / 8 - x3 / 30 + x4 / 144 - x5 / 840 + x6 / 5_760;
  } else {
    const expNegativeX = finiteExponential(
      -x,
      'first-moment exponential integral exponential',
    );
    scaled = (-Math.expm1(-x) - x * expNegativeX) / (x * x);
  }
  return finiteNumber(
    delta * delta * scaled,
    'first-moment exponential integral',
  );
}

function finiteExponential(exponent: number, label: string): number {
  return finiteNumber(Math.exp(exponent), label);
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

interface IncreasingRateRootInput {
  readonly target: number;
  readonly valueAtRate: (rate: number) => number;
  readonly label: string;
  readonly initialUpperRate: number;
}

function solveNonNegativeIncreasingRate(
  input: IncreasingRateRootInput,
): number {
  const target = finiteNumber(input.target, input.label);
  let lowerRate = 0;
  let lowerResidual = finiteNumber(
    input.valueAtRate(lowerRate) - target,
    `${input.label} lower-bound residual`,
  );
  if (Math.abs(lowerResidual) <= ROOT_FUNCTION_TOLERANCE) return 0;
  if (lowerResidual > 0) {
    throw new RangeError(`${input.label} is below the zero-hazard lower bound`);
  }

  let upperRate = Math.min(
    positiveNumber(input.initialUpperRate, 'initial root upper rate'),
    MAX_SOLVER_HAZARD_RATE_PER_YEAR,
  );
  let upperResidual = finiteNumber(
    input.valueAtRate(upperRate) - target,
    `${input.label} upper-bound residual`,
  );
  while (upperResidual < 0 && upperRate < MAX_SOLVER_HAZARD_RATE_PER_YEAR) {
    upperRate = Math.min(upperRate * 2, MAX_SOLVER_HAZARD_RATE_PER_YEAR);
    upperResidual = finiteNumber(
      input.valueAtRate(upperRate) - target,
      `${input.label} upper-bound residual`,
    );
  }
  if (upperResidual < 0) {
    throw new RangeError(
      `${input.label} cannot be reached below the solver hazard bound`,
    );
  }
  if (Math.abs(upperResidual) <= ROOT_FUNCTION_TOLERANCE) return upperRate;

  for (let iteration = 0; iteration < ROOT_MAX_ITERATIONS; iteration += 1) {
    const middleRate = lowerRate + (upperRate - lowerRate) / 2;
    const middleResidual = finiteNumber(
      input.valueAtRate(middleRate) - target,
      `${input.label} root residual`,
    );
    if (
      Math.abs(middleResidual) <= ROOT_FUNCTION_TOLERANCE ||
      upperRate - lowerRate <= ROOT_RATE_TOLERANCE * Math.max(1, middleRate)
    ) {
      return finiteNumber(middleRate, `implied rate for ${input.label}`);
    }
    if (middleResidual < 0) {
      lowerRate = middleRate;
      lowerResidual = middleResidual;
    } else {
      upperRate = middleRate;
      upperResidual = middleResidual;
    }
  }

  // The loop bound is defensive; ordinary convergence returns above.
  throw new RangeError(`${input.label} root solver did not converge`);
}
