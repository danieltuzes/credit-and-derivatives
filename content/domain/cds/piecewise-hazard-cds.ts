import {
  finiteNumber,
  nonNegativeNumber,
  paymentFrequency,
  positiveNumber,
  unitIntervalNumber,
} from '../scalars';
import {
  simplifiedFlatHazardCdsLegFactors,
  simplifiedFlatHazardQuoteToUpfront,
} from './flat-hazard-cds';

const MAX_REGULAR_PERIODS = 10_000;
const MAX_SOLVER_HAZARD_RATE_PER_YEAR = 1_000_000;
const ROOT_FUNCTION_TOLERANCE = 1e-14;
const ROOT_RATE_TOLERANCE = 1e-12;
const ROOT_MAX_ITERATIONS = 200;
const KNOT_ALIGNMENT_TOLERANCE = 1e-10;

/**
 * One segment of a piecewise-constant risk-neutral hazard curve.
 *
 * The segment covers the model-year interval from the previous segment's end
 * (or valuation time zero for the first segment) up to and including
 * `endTimeYears`. The hazard rate is a non-negative constant per model year on
 * that interval. The last segment is extended flat beyond its end when a
 * contract matures later than the final knot.
 */
export interface PiecewiseHazardSegment {
  readonly endTimeYears: number;
  readonly hazardRatePerYear: number;
}

/**
 * The simplified CDS model of `flat-hazard-cds.ts` with the single constant
 * hazard rate replaced by a piecewise-constant term structure.
 *
 * Time is measured in model years from valuation time zero. The risk-free rate
 * is one continuously compounded deterministic rate. Recovery is one
 * deterministic fraction of notional. Premium periods are equal annual,
 * semiannual, or quarterly model-year periods; every hazard knot must fall on a
 * period boundary so each period sees one constant hazard rate. There are no
 * calendar dates, day counts, stubs, settlement lags, or accrued-at-inception
 * amounts.
 */
export interface PiecewiseHazardCdsModelInput {
  readonly termYears: number;
  readonly paymentFrequency: number;
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly recoveryRate: number;
  readonly hazardSegments: readonly PiecewiseHazardSegment[];
}

export interface PiecewiseHazardCdsPeriodContribution {
  /** One-based period number. */
  readonly periodNumber: number;
  readonly startTimeYears: number;
  readonly endTimeYears: number;
  readonly accrualYearFraction: number;
  /** The constant hazard rate applied inside this period. */
  readonly hazardRatePerYear: number;
  readonly discountFactorAtPayment: number;
  readonly survivalProbabilityAtPeriodStart: number;
  readonly survivalProbabilityAtPeriodEnd: number;
  readonly intervalRiskNeutralDefaultProbability: number;
  /** PV per unit notional and per unit annual coupon rate, in model years. */
  readonly scheduledPremiumAnnuityContributionYears: number;
  /** Exact accrued-on-default premium factor for this period, in model years. */
  readonly accruedOnDefaultAnnuityContributionYears: number;
  /** Discounted default contribution multiplied by loss given default. */
  readonly protectionLegFactorContribution: number;
}

export interface PiecewiseHazardCdsLegFactors {
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
  /** Model survival probability at the contract's maturity. */
  readonly survivalProbabilityAtMaturity: number;
  readonly periodContributions: readonly PiecewiseHazardCdsPeriodContribution[];
}

/**
 * Values the two CDS legs under a piecewise-constant hazard curve.
 *
 * Inside one premium period the hazard rate is constant, so that period is
 * exactly a one-period flat-hazard model started from the survival probability
 * and discount factor reached at the period's start. The exact default-time
 * kernels of `simplifiedFlatHazardCdsLegFactors` are therefore reused period by
 * period: each one-period contribution is scaled by the discounted survival
 * factor accumulated over the preceding periods. This is the semigroup property
 * of survival under a deterministic hazard rate, not a new approximation.
 */
export function piecewiseHazardCdsLegFactors(
  input: PiecewiseHazardCdsModelInput,
): PiecewiseHazardCdsLegFactors {
  const validated = validateModelInput(input);
  const {
    numberOfPeriods,
    accrualYearFraction,
    continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
    recoveryRate,
    hazardRateForPeriod,
  } = validated;

  const periodContributions: PiecewiseHazardCdsPeriodContribution[] = [];
  let survivalAtPeriodStart = 1;

  for (let index = 0; index < numberOfPeriods; index += 1) {
    const periodNumber = index + 1;
    const startTimeYears = index * accrualYearFraction;
    const endTimeYears = periodNumber * accrualYearFraction;
    const hazardRatePerYear = hazardRateForPeriod(periodNumber);

    // Kernel for one period starting at survival one and discount one.
    const kernel = simplifiedFlatHazardCdsLegFactors({
      termYears: accrualYearFraction,
      paymentFrequency: validated.paymentFrequency,
      continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
      constantRiskNeutralHazardRatePerYear: hazardRatePerYear,
      recoveryRate,
    });
    const kernelPeriod = kernel.periodContributions[0];
    if (kernelPeriod === undefined) {
      throw new RangeError(
        `one-period kernel produced no period in period ${periodNumber}`,
      );
    }

    const discountFactorAtPeriodStart = finiteNumber(
      Math.exp(-riskFreeRate * startTimeYears),
      `discount factor at the start of period ${periodNumber}`,
    );
    const scale = finiteNumber(
      survivalAtPeriodStart * discountFactorAtPeriodStart,
      `discounted survival at the start of period ${periodNumber}`,
    );
    const survivalAtPeriodEnd = finiteNumber(
      survivalAtPeriodStart * kernelPeriod.survivalProbabilityAtPeriodEnd,
      `survival probability at the end of period ${periodNumber}`,
    );

    periodContributions.push({
      periodNumber,
      startTimeYears,
      endTimeYears,
      accrualYearFraction,
      hazardRatePerYear,
      discountFactorAtPayment: finiteNumber(
        discountFactorAtPeriodStart * kernelPeriod.discountFactorAtPayment,
        `discount factor in period ${periodNumber}`,
      ),
      survivalProbabilityAtPeriodStart: survivalAtPeriodStart,
      survivalProbabilityAtPeriodEnd: survivalAtPeriodEnd,
      intervalRiskNeutralDefaultProbability: finiteNumber(
        survivalAtPeriodStart *
          kernelPeriod.intervalRiskNeutralDefaultProbability,
        `default probability in period ${periodNumber}`,
      ),
      scheduledPremiumAnnuityContributionYears: finiteNumber(
        scale * kernelPeriod.scheduledPremiumAnnuityContributionYears,
        `scheduled premium annuity in period ${periodNumber}`,
      ),
      accruedOnDefaultAnnuityContributionYears: finiteNumber(
        scale * kernelPeriod.accruedOnDefaultAnnuityContributionYears,
        `accrued-on-default annuity in period ${periodNumber}`,
      ),
      protectionLegFactorContribution: finiteNumber(
        scale * kernelPeriod.protectionLegFactorContribution,
        `protection leg factor in period ${periodNumber}`,
      ),
    });

    survivalAtPeriodStart = survivalAtPeriodEnd;
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
    survivalProbabilityAtMaturity: survivalAtPeriodStart,
    periodContributions,
  };
}

/**
 * One quoted tenor of a credit curve, expressed as the traded contract's price:
 * the fixed running coupon paid and the signed upfront fraction of notional
 * exchanged at valuation time (positive when paid by the protection buyer).
 *
 * A zero-upfront par quote is the special case `upfrontFractionPaidByProtectionBuyer: 0`
 * with `fixedCouponAnnualRate` equal to the quoted par spread.
 */
export interface CreditCurveTenorMark {
  readonly termYears: number;
  readonly fixedCouponAnnualRate: number;
  readonly upfrontFractionPaidByProtectionBuyer: number;
}

export interface CreditCurveFitInput {
  readonly paymentFrequency: number;
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly recoveryRate: number;
  /** Strictly increasing maturities. */
  readonly tenorMarks: readonly CreditCurveTenorMark[];
}

export interface CreditCurveFittedTenor extends CreditCurveTenorMark {
  /** Hazard rate on the segment ending at this tenor. */
  readonly segmentHazardRatePerYear: number;
  /** Segment start time: the previous tenor or zero. */
  readonly segmentStartTimeYears: number;
  /** Fitted survival probability at this tenor's maturity. */
  readonly survivalProbabilityAtMaturity: number;
  /** Premium annuity of this tenor's contract under the fitted curve. */
  readonly premiumAnnuityYears: number;
  /** Protection factor of this tenor's contract under the fitted curve. */
  readonly protectionLegFactor: number;
  /** Zero-upfront par spread of this tenor under the whole fitted curve. */
  readonly parSpreadAnnualRate: number;
  /** Buyer value per unit notional less the mark's upfront; zero up to arithmetic. */
  readonly repricingResidualFraction: number;
}

export interface CreditCurveFitResult {
  readonly hazardSegments: readonly PiecewiseHazardSegment[];
  readonly tenors: readonly CreditCurveFittedTenor[];
}

/**
 * Fits a piecewise-constant hazard curve so that every tenor's contract
 * reprices to its mark, one tenor at a time in maturity order.
 *
 * For tenor k, the hazard rates on earlier segments are already fixed and the
 * hazard rate on the segment ending at tenor k is the unique non-negative root
 * of: protection factor minus coupon times premium annuity equals the upfront
 * fraction. The buyer value of a contract is increasing in the hazard rate of
 * any segment inside its life, so the root is bracketed and bisected.
 *
 * The fit rejects a set of marks that would need a negative segment hazard
 * rate: a mark that is cheaper than the zero-hazard value implied by the
 * earlier segments cannot be reproduced by a non-decreasing cumulative default
 * probability.
 */
export function fitPiecewiseHazardCreditCurve(
  input: CreditCurveFitInput,
): CreditCurveFitResult {
  const frequency = paymentFrequency(input.paymentFrequency);
  const riskFreeRate = finiteNumber(
    input.continuouslyCompoundedRiskFreeRatePerYear,
    'continuouslyCompoundedRiskFreeRatePerYear',
  );
  const recoveryRate = unitIntervalNumber(input.recoveryRate, 'recoveryRate');
  if (recoveryRate === 1) {
    throw new RangeError(
      'recoveryRate must be below one for a credit curve fit to identify hazard',
    );
  }
  if (input.tenorMarks.length === 0) {
    throw new RangeError('tenorMarks must contain at least one tenor');
  }

  const segments: PiecewiseHazardSegment[] = [];
  const tenors: CreditCurveFittedTenor[] = [];
  let previousTermYears = 0;

  for (const [index, mark] of input.tenorMarks.entries()) {
    const label = `tenorMarks[${index}]`;
    const termYears = positiveNumber(mark.termYears, `${label}.termYears`);
    const fixedCouponAnnualRate = nonNegativeNumber(
      mark.fixedCouponAnnualRate,
      `${label}.fixedCouponAnnualRate`,
    );
    const upfrontFraction = finiteNumber(
      mark.upfrontFractionPaidByProtectionBuyer,
      `${label}.upfrontFractionPaidByProtectionBuyer`,
    );
    if (termYears <= previousTermYears) {
      throw new RangeError(
        `${label}.termYears must be later than the previous tenor`,
      );
    }
    if (upfrontFraction >= 1 - recoveryRate) {
      throw new RangeError(
        `${label}.upfrontFractionPaidByProtectionBuyer must be below the loss-given-default upper bound`,
      );
    }

    const buyerValueAtSegmentHazard = (hazardRatePerYear: number): number => {
      const factors = piecewiseHazardCdsLegFactors({
        termYears,
        paymentFrequency: frequency,
        continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
        recoveryRate,
        hazardSegments: [
          ...segments,
          { endTimeYears: termYears, hazardRatePerYear },
        ],
      });
      return finiteNumber(
        factors.protectionLegFactor -
          fixedCouponAnnualRate * factors.premiumAnnuityYears,
        `${label} buyer value per unit notional`,
      );
    };

    const segmentHazardRatePerYear = solveNonNegativeIncreasingRate({
      target: upfrontFraction,
      valueAtRate: buyerValueAtSegmentHazard,
      label: `${label} mark`,
      initialUpperRate: Math.max(
        0.01,
        (2 * Math.max(fixedCouponAnnualRate, Math.abs(upfrontFraction))) /
          (1 - recoveryRate),
      ),
    });

    segments.push({
      endTimeYears: termYears,
      hazardRatePerYear: segmentHazardRatePerYear,
    });

    const fitted = piecewiseHazardCdsLegFactors({
      termYears,
      paymentFrequency: frequency,
      continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
      recoveryRate,
      hazardSegments: segments,
    });
    tenors.push({
      termYears,
      fixedCouponAnnualRate,
      upfrontFractionPaidByProtectionBuyer: upfrontFraction,
      segmentHazardRatePerYear,
      segmentStartTimeYears: previousTermYears,
      survivalProbabilityAtMaturity: fitted.survivalProbabilityAtMaturity,
      premiumAnnuityYears: fitted.premiumAnnuityYears,
      protectionLegFactor: fitted.protectionLegFactor,
      parSpreadAnnualRate: fitted.parSpreadAnnualRate,
      repricingResidualFraction: finiteNumber(
        fitted.protectionLegFactor -
          fixedCouponAnnualRate * fitted.premiumAnnuityYears -
          upfrontFraction,
        `${label} repricing residual`,
      ),
    });

    previousTermYears = termYears;
  }

  return { hazardSegments: segments, tenors };
}

export interface MarketStandardQuoteCurveInput {
  readonly paymentFrequency: number;
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly recoveryRate: number;
  /** The fixed running coupon shared by every tenor's standard contract. */
  readonly fixedCouponAnnualRate: number;
  /** Strictly increasing maturities with their conventional quotes. */
  readonly tenorQuotes: readonly {
    readonly termYears: number;
    readonly marketStandardQuoteAnnualRate: number;
  }[];
}

export interface TransformedTenorMark extends CreditCurveTenorMark {
  readonly marketStandardQuoteAnnualRate: number;
  /** The single flat hazard rate the converter implied for this tenor alone. */
  readonly flatHazardRatePerYear: number;
  /** Premium annuity of this tenor under its own flat hazard rate. */
  readonly flatPremiumAnnuityYears: number;
  /** Survival probability at maturity under this tenor's own flat hazard rate. */
  readonly flatSurvivalProbabilityAtMaturity: number;
}

/**
 * Transforms a curve marked in market-standard quotes into the traded prices
 * those marks stand for: one signed upfront fraction per tenor at the shared
 * standard coupon, using the tenor-by-tenor flat-hazard converter of
 * `simplifiedFlatHazardQuoteToUpfront`.
 *
 * This is a change of quotation, not a curve fit. Each tenor is converted with
 * its own flat hazard rate; the flat rates of different tenors are not one
 * term structure and are reported only for comparison with a fitted curve.
 */
export function transformMarketStandardQuoteCurve(
  input: MarketStandardQuoteCurveInput,
): readonly TransformedTenorMark[] {
  const fixedCouponAnnualRate = nonNegativeNumber(
    input.fixedCouponAnnualRate,
    'fixedCouponAnnualRate',
  );
  if (input.tenorQuotes.length === 0) {
    throw new RangeError('tenorQuotes must contain at least one tenor');
  }
  let previousTermYears = 0;
  return input.tenorQuotes.map((quote, index) => {
    const label = `tenorQuotes[${index}]`;
    const termYears = positiveNumber(quote.termYears, `${label}.termYears`);
    if (termYears <= previousTermYears) {
      throw new RangeError(
        `${label}.termYears must be later than the previous tenor`,
      );
    }
    previousTermYears = termYears;
    const converted = simplifiedFlatHazardQuoteToUpfront({
      termYears,
      paymentFrequency: input.paymentFrequency,
      continuouslyCompoundedRiskFreeRatePerYear:
        input.continuouslyCompoundedRiskFreeRatePerYear,
      recoveryRate: input.recoveryRate,
      notional: 1,
      fixedCouponAnnualRate,
      marketStandardQuoteAnnualRate: quote.marketStandardQuoteAnnualRate,
    });
    return {
      termYears,
      fixedCouponAnnualRate,
      upfrontFractionPaidByProtectionBuyer:
        converted.fairUpfrontFractionPaidByProtectionBuyer,
      marketStandardQuoteAnnualRate: converted.marketStandardQuoteAnnualRate,
      flatHazardRatePerYear: converted.impliedRiskNeutralHazardRatePerYear,
      flatPremiumAnnuityYears: converted.premiumAnnuityYears,
      flatSurvivalProbabilityAtMaturity: Math.exp(
        -converted.impliedRiskNeutralHazardRatePerYear * termYears,
      ),
    };
  });
}

/** Survival probability at a model time under a piecewise-constant hazard curve. */
export function piecewiseHazardSurvivalProbability(
  hazardSegments: readonly PiecewiseHazardSegment[],
  timeYears: number,
): number {
  const time = nonNegativeNumber(timeYears, 'timeYears');
  validateSegments(hazardSegments);
  let cumulativeHazard = 0;
  let previousEnd = 0;
  for (const segment of hazardSegments) {
    const upper = Math.min(segment.endTimeYears, time);
    if (upper > previousEnd) {
      cumulativeHazard += segment.hazardRatePerYear * (upper - previousEnd);
    }
    previousEnd = segment.endTimeYears;
    if (time <= segment.endTimeYears) break;
  }
  if (time > previousEnd) {
    const last = hazardSegments[hazardSegments.length - 1];
    if (last === undefined) {
      throw new RangeError('hazardSegments must contain at least one segment');
    }
    cumulativeHazard += last.hazardRatePerYear * (time - previousEnd);
  }
  return finiteNumber(
    Math.exp(-cumulativeHazard),
    `survival probability at ${timeYears}`,
  );
}

interface ValidatedModelInput {
  readonly numberOfPeriods: number;
  readonly accrualYearFraction: number;
  readonly paymentFrequency: number;
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly recoveryRate: number;
  readonly hazardRateForPeriod: (periodNumber: number) => number;
}

function validateSegments(segments: readonly PiecewiseHazardSegment[]): void {
  if (segments.length === 0) {
    throw new RangeError('hazardSegments must contain at least one segment');
  }
  let previousEnd = 0;
  for (const [index, segment] of segments.entries()) {
    const label = `hazardSegments[${index}]`;
    const end = positiveNumber(segment.endTimeYears, `${label}.endTimeYears`);
    nonNegativeNumber(segment.hazardRatePerYear, `${label}.hazardRatePerYear`);
    if (end <= previousEnd) {
      throw new RangeError(
        `${label}.endTimeYears must be later than the previous segment end`,
      );
    }
    previousEnd = end;
  }
}

function validateModelInput(
  input: PiecewiseHazardCdsModelInput,
): ValidatedModelInput {
  const termYears = positiveNumber(input.termYears, 'termYears');
  const frequency = paymentFrequency(input.paymentFrequency);
  const riskFreeRate = finiteNumber(
    input.continuouslyCompoundedRiskFreeRatePerYear,
    'continuouslyCompoundedRiskFreeRatePerYear',
  );
  const recoveryRate = unitIntervalNumber(input.recoveryRate, 'recoveryRate');
  validateSegments(input.hazardSegments);

  const accrualYearFraction = 1 / frequency;
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

  for (const [index, segment] of input.hazardSegments.entries()) {
    if (segment.endTimeYears >= termYears) break;
    const periodsToKnot = segment.endTimeYears * frequency;
    if (
      Math.abs(periodsToKnot - Math.round(periodsToKnot)) >
      KNOT_ALIGNMENT_TOLERANCE
    ) {
      throw new RangeError(
        `hazardSegments[${index}].endTimeYears must fall on a premium period boundary`,
      );
    }
  }

  const hazardRateForPeriod = (periodNumber: number): number => {
    const periodEnd = periodNumber * accrualYearFraction;
    for (const segment of input.hazardSegments) {
      if (periodEnd <= segment.endTimeYears + KNOT_ALIGNMENT_TOLERANCE) {
        return segment.hazardRatePerYear;
      }
    }
    // Beyond the last knot the curve is extended flat.
    return input.hazardSegments[input.hazardSegments.length - 1]!
      .hazardRatePerYear;
  };

  return {
    numberOfPeriods,
    accrualYearFraction,
    paymentFrequency: frequency,
    continuouslyCompoundedRiskFreeRatePerYear: riskFreeRate,
    recoveryRate,
    hazardRateForPeriod,
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
  const lowerResidual = finiteNumber(
    input.valueAtRate(lowerRate) - target,
    `${input.label} lower-bound residual`,
  );
  if (Math.abs(lowerResidual) <= ROOT_FUNCTION_TOLERANCE) return 0;
  if (lowerResidual > 0) {
    throw new RangeError(
      `${input.label} is below the zero-hazard lower bound: the marks would need a negative segment hazard rate`,
    );
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
    } else {
      upperRate = middleRate;
    }
  }

  // The loop bound is defensive; ordinary convergence returns above.
  throw new RangeError(`${input.label} root solver did not converge`);
}
