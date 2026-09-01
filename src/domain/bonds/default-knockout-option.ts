import {
  europeanOptionPayoff,
  type EuropeanOptionKind,
} from '../derivatives/european-options';
import {
  finiteNumber,
  nonNegativeNumber,
  positiveNumber,
  unitIntervalNumber,
} from '../scalars';

export interface CreditRateLatticeStep {
  /** One-period currency-now per one unit of next-time currency. */
  readonly discountFactors: readonly number[];
  readonly riskNeutralUpProbabilities: readonly number[];
  /** Conditional on the issuer being alive at the current node. */
  readonly conditionalSurvivalProbabilities: readonly number[];
  /** Currency paid at the next lattice date if default occurs during the period. */
  readonly recoveriesOnDefault: readonly number[];
}

export interface DefaultKnockoutBondOptionInput {
  /** Strictly increasing exact model-year times, beginning with zero. */
  readonly timesYears: readonly number[];
  readonly steps: readonly CreditRateLatticeStep[];
  /** Cash paid at each future time only if the issuer survives that period. */
  readonly scheduledSurvivalCashFlows: readonly number[];
  /** Exercise occurs just after the cash flow at this time index. */
  readonly optionExpiryTimeIndex: number;
  readonly optionKind: EuropeanOptionKind;
  /** Dirty cash strike in currency per bond at the stated exercise instant. */
  readonly strikePrice: number;
}

export interface DefaultKnockoutBondOptionValue {
  /** Ex-cash-flow bond values conditional on the issuer being alive. */
  readonly aliveBondValuesByTime: readonly (readonly number[])[];
  /** Option values conditional on the issuer being alive. */
  readonly aliveOptionValuesByTime: readonly (readonly number[])[];
  readonly bondValueNow: number;
  readonly optionValueNow: number;
}

/**
 * Values a European option on a defaultable fixed-cash-flow bond. Issuer
 * default before exercise extinguishes the option with zero option rebate;
 * bond recovery remains a separate next-date cash flow.
 */
export function valueDefaultKnockoutBondOption(
  input: DefaultKnockoutBondOptionInput,
): DefaultKnockoutBondOptionValue {
  const numberOfSteps = input.steps.length;
  if (numberOfSteps < 2) {
    throw new RangeError('steps must contain at least two time steps');
  }
  if (
    input.timesYears.length !== numberOfSteps + 1 ||
    input.scheduledSurvivalCashFlows.length !== numberOfSteps
  ) {
    throw new RangeError(
      'timesYears and scheduledSurvivalCashFlows must align with steps',
    );
  }
  if (input.timesYears[0] !== 0) {
    throw new RangeError('timesYears must begin at zero');
  }
  for (let index = 0; index < input.timesYears.length; index += 1) {
    finiteNumber(input.timesYears[index], `timesYears[${index}]`);
    if (index > 0 && input.timesYears[index] <= input.timesYears[index - 1]) {
      throw new RangeError('timesYears must be strictly increasing');
    }
  }
  if (
    !Number.isInteger(input.optionExpiryTimeIndex) ||
    input.optionExpiryTimeIndex < 1 ||
    input.optionExpiryTimeIndex >= numberOfSteps
  ) {
    throw new RangeError(
      'optionExpiryTimeIndex must identify a time before bond maturity',
    );
  }
  const strikePrice = nonNegativeNumber(input.strikePrice, 'strikePrice');
  if (input.optionKind !== 'call' && input.optionKind !== 'put') {
    throw new RangeError('optionKind must be "call" or "put"');
  }

  const validatedSteps = input.steps.map((step, timeIndex) => {
    const nodeCount = timeIndex + 1;
    if (
      step.discountFactors.length !== nodeCount ||
      step.riskNeutralUpProbabilities.length !== nodeCount ||
      step.conditionalSurvivalProbabilities.length !== nodeCount ||
      step.recoveriesOnDefault.length !== nodeCount
    ) {
      throw new RangeError(
        `steps[${timeIndex}] must contain ${nodeCount} nodes`,
      );
    }
    return {
      discountFactors: step.discountFactors.map((value, node) =>
        positiveNumber(value, `steps[${timeIndex}].discountFactors[${node}]`),
      ),
      riskNeutralUpProbabilities: step.riskNeutralUpProbabilities.map(
        (value, node) =>
          unitIntervalNumber(
            value,
            `steps[${timeIndex}].riskNeutralUpProbabilities[${node}]`,
          ),
      ),
      conditionalSurvivalProbabilities:
        step.conditionalSurvivalProbabilities.map((value, node) =>
          unitIntervalNumber(
            value,
            `steps[${timeIndex}].conditionalSurvivalProbabilities[${node}]`,
          ),
        ),
      recoveriesOnDefault: step.recoveriesOnDefault.map((value, node) =>
        nonNegativeNumber(
          value,
          `steps[${timeIndex}].recoveriesOnDefault[${node}]`,
        ),
      ),
    };
  });
  const cashFlows = input.scheduledSurvivalCashFlows.map((value, index) =>
    nonNegativeNumber(value, `scheduledSurvivalCashFlows[${index}]`),
  );

  const aliveBondValuesByTime: number[][] = Array.from(
    { length: numberOfSteps + 1 },
    () => [],
  );
  aliveBondValuesByTime[numberOfSteps] = Array(numberOfSteps + 1).fill(0);

  for (let timeIndex = numberOfSteps - 1; timeIndex >= 0; timeIndex -= 1) {
    const step = validatedSteps[timeIndex];
    aliveBondValuesByTime[timeIndex] = Array.from(
      { length: timeIndex + 1 },
      (_, node) => {
        const q = step.riskNeutralUpProbabilities[node];
        const survival = step.conditionalSurvivalProbabilities[node];
        const survivingNextValue =
          cashFlows[timeIndex] +
          (1 - q) * aliveBondValuesByTime[timeIndex + 1][node] +
          q * aliveBondValuesByTime[timeIndex + 1][node + 1];
        return finiteNumber(
          step.discountFactors[node] *
            (survival * survivingNextValue +
              (1 - survival) * step.recoveriesOnDefault[node]),
          `aliveBondValuesByTime[${timeIndex}][${node}]`,
        );
      },
    );
  }

  const expiryIndex = input.optionExpiryTimeIndex;
  const aliveOptionValuesByTime: number[][] = Array.from(
    { length: expiryIndex + 1 },
    () => [],
  );
  aliveOptionValuesByTime[expiryIndex] = aliveBondValuesByTime[expiryIndex].map(
    (bondValue) =>
      europeanOptionPayoff({
        kind: input.optionKind,
        underlyingPriceAtExpiry: bondValue,
        strikePrice,
      }),
  );

  for (let timeIndex = expiryIndex - 1; timeIndex >= 0; timeIndex -= 1) {
    const step = validatedSteps[timeIndex];
    aliveOptionValuesByTime[timeIndex] = Array.from(
      { length: timeIndex + 1 },
      (_, node) => {
        const q = step.riskNeutralUpProbabilities[node];
        const survival = step.conditionalSurvivalProbabilities[node];
        const continuation =
          (1 - q) * aliveOptionValuesByTime[timeIndex + 1][node] +
          q * aliveOptionValuesByTime[timeIndex + 1][node + 1];
        return finiteNumber(
          step.discountFactors[node] * survival * continuation,
          `aliveOptionValuesByTime[${timeIndex}][${node}]`,
        );
      },
    );
  }

  return {
    aliveBondValuesByTime,
    aliveOptionValuesByTime,
    bondValueNow: aliveBondValuesByTime[0][0],
    optionValueNow: aliveOptionValuesByTime[0][0],
  };
}
