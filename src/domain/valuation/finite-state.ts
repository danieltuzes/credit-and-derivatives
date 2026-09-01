import {
  finiteNumber,
  positiveNumber,
  unitIntervalNumber,
} from '../scalars';

export interface RiskNeutralState {
  readonly probability: number;
  readonly payoff: number;
}

export interface OnePeriodBinomialClaimInput {
  readonly underlyingValueNow: number;
  readonly underlyingValueUp: number;
  readonly underlyingValueDown: number;
  readonly payoffUp: number;
  readonly payoffDown: number;
  /** Time-zero currency per one expiry-time currency unit. */
  readonly discountFactorToExpiry: number;
}

export interface OnePeriodBinomialClaimValue {
  readonly riskNeutralUpProbability: number;
  readonly riskNeutralDownProbability: number;
  readonly hedgeUnits: number;
  readonly riskFreeCashAtExpiry: number;
  readonly riskFreeCashValueNow: number;
  readonly replicationValue: number;
  readonly riskNeutralValue: number;
}

/** Discount a finite risk-neutral expected payoff with one deterministic factor. */
export function finiteStateRiskNeutralValue(
  states: readonly RiskNeutralState[],
  discountFactorToPayoff: number,
): number {
  if (states.length === 0) {
    throw new RangeError('states must contain at least one state');
  }
  const discountFactor = positiveNumber(
    discountFactorToPayoff,
    'discountFactorToPayoff',
  );

  let probabilitySum = 0;
  let expectedPayoff = 0;
  for (const [index, state] of states.entries()) {
    const probability = unitIntervalNumber(
      state.probability,
      `states[${index}].probability`,
    );
    const payoff = finiteNumber(state.payoff, `states[${index}].payoff`);
    probabilitySum += probability;
    expectedPayoff += probability * payoff;
  }

  if (Math.abs(probabilitySum - 1) > 1e-12) {
    throw new RangeError('state probabilities must sum to one');
  }

  return finiteNumber(
    discountFactor * expectedPayoff,
    'finite-state risk-neutral value',
  );
}

/**
 * Values one-period contingent cash flows by both replication and supplied-model
 * risk-neutral weighting. The underlying pays no income before expiry.
 */
export function onePeriodBinomialClaimValue(
  input: OnePeriodBinomialClaimInput,
): OnePeriodBinomialClaimValue {
  const underlyingNow = finiteNumber(
    input.underlyingValueNow,
    'underlyingValueNow',
  );
  const underlyingUp = finiteNumber(
    input.underlyingValueUp,
    'underlyingValueUp',
  );
  const underlyingDown = finiteNumber(
    input.underlyingValueDown,
    'underlyingValueDown',
  );
  const payoffUp = finiteNumber(input.payoffUp, 'payoffUp');
  const payoffDown = finiteNumber(input.payoffDown, 'payoffDown');
  const discountFactor = positiveNumber(
    input.discountFactorToExpiry,
    'discountFactorToExpiry',
  );

  if (underlyingUp <= underlyingDown) {
    throw new RangeError('underlyingValueUp must exceed underlyingValueDown');
  }

  const expiryValueOfUnderlyingNow = underlyingNow / discountFactor;
  const rawUpProbability =
    (expiryValueOfUnderlyingNow - underlyingDown) /
    (underlyingUp - underlyingDown);
  const riskNeutralUpProbability = unitIntervalNumber(
    rawUpProbability,
    'riskNeutralUpProbability',
  );
  const riskNeutralDownProbability = finiteNumber(
    1 - riskNeutralUpProbability,
    'riskNeutralDownProbability',
  );

  const hedgeUnits = finiteNumber(
    (payoffUp - payoffDown) / (underlyingUp - underlyingDown),
    'hedgeUnits',
  );
  const riskFreeCashAtExpiry = finiteNumber(
    payoffDown - hedgeUnits * underlyingDown,
    'riskFreeCashAtExpiry',
  );
  const riskFreeCashValueNow = finiteNumber(
    discountFactor * riskFreeCashAtExpiry,
    'riskFreeCashValueNow',
  );
  const replicationValue = finiteNumber(
    hedgeUnits * underlyingNow + riskFreeCashValueNow,
    'replicationValue',
  );
  const riskNeutralValue = finiteStateRiskNeutralValue(
    [
      { probability: riskNeutralUpProbability, payoff: payoffUp },
      { probability: riskNeutralDownProbability, payoff: payoffDown },
    ],
    discountFactor,
  );

  return {
    riskNeutralUpProbability,
    riskNeutralDownProbability,
    hedgeUnits,
    riskFreeCashAtExpiry,
    riskFreeCashValueNow,
    replicationValue,
    riskNeutralValue,
  };
}
