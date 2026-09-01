import {
  finiteNumber,
  nonNegativeNumber,
  positiveNumber,
  unitIntervalNumber,
} from '../scalars';

export interface RiskyPromisedPaymentWithRecoveryAtMaturityInput {
  /** Positive promised receipt in currency units. */
  readonly promisedAmount: number;
  /** Model S(0,T), conditional on survival at valuation time zero. */
  readonly survivalProbabilityAtMaturity: number;
  /** Fraction of the promised amount recovered after default. */
  readonly recoveryRate: number;
  /** D(0,T), expressed as a non-negative price per unit paid at T. */
  readonly discountFactorToMaturity: number;
}

export interface RiskyPromisedPaymentWithRecoveryAtMaturityValue {
  readonly survivalComponentPresentValue: number;
  readonly recoveryAtMaturityComponentPresentValue: number;
  readonly totalPresentValue: number;
}

/**
 * Values one positive promised payment using a deliberately strong teaching
 * convention: both the survival payment and recovery-of-promised-amount after
 * any earlier default are paid at the same maturity time T. This is not a
 * pay-at-default model.
 */
export function valueRiskyPromisedPaymentWithRecoveryAtMaturity(
  input: RiskyPromisedPaymentWithRecoveryAtMaturityInput,
): RiskyPromisedPaymentWithRecoveryAtMaturityValue {
  const promisedAmount = positiveNumber(input.promisedAmount, 'promisedAmount');
  const survivalProbability = unitIntervalNumber(
    input.survivalProbabilityAtMaturity,
    'survivalProbabilityAtMaturity',
  );
  const recoveryRate = unitIntervalNumber(input.recoveryRate, 'recoveryRate');
  const discountFactor = nonNegativeNumber(
    input.discountFactorToMaturity,
    'discountFactorToMaturity',
  );

  const survivalComponentPresentValue = finiteNumber(
    promisedAmount * survivalProbability * discountFactor,
    'survival component present value',
  );
  const recoveryAtMaturityComponentPresentValue = finiteNumber(
    promisedAmount * (1 - survivalProbability) * recoveryRate * discountFactor,
    'recovery-at-maturity component present value',
  );
  const totalPresentValue = finiteNumber(
    survivalComponentPresentValue + recoveryAtMaturityComponentPresentValue,
    'risky promised payment present value',
  );

  return {
    survivalComponentPresentValue,
    recoveryAtMaturityComponentPresentValue,
    totalPresentValue,
  };
}
