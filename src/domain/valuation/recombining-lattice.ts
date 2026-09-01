import { finiteNumber, positiveNumber, unitIntervalNumber } from '../scalars';

export interface RecombiningLatticeStep {
  /** One-period currency-now per one unit of next-time currency at each node. */
  readonly discountFactors: readonly number[];
  readonly riskNeutralUpProbabilities: readonly number[];
}

export interface BackwardInductionInput {
  readonly steps: readonly RecombiningLatticeStep[];
  readonly terminalValues: readonly number[];
  /** Cash paid at each next-time node before its continuation value. */
  readonly cashFlowsAtTimes?: readonly (readonly number[])[];
}

export interface BackwardInductionResult {
  /** valuesByTime[timeIndex][downMoves] */
  readonly valuesByTime: readonly (readonly number[])[];
  readonly valueNow: number;
}

/**
 * Values a claim on a caller-supplied recombining pricing lattice. Time steps
 * may be irregular because every node supplies its own one-period factor.
 */
export function backwardInductionValue(
  input: BackwardInductionInput,
): BackwardInductionResult {
  const numberOfSteps = input.steps.length;
  if (numberOfSteps === 0) {
    throw new RangeError('steps must contain at least one time step');
  }
  if (input.terminalValues.length !== numberOfSteps + 1) {
    throw new RangeError('terminalValues must contain steps.length + 1 nodes');
  }
  if (
    input.cashFlowsAtTimes !== undefined &&
    input.cashFlowsAtTimes.length !== numberOfSteps
  ) {
    throw new RangeError(
      'cashFlowsAtTimes must contain one row per future time',
    );
  }

  const valuesByTime: number[][] = Array.from(
    { length: numberOfSteps + 1 },
    () => [],
  );
  valuesByTime[numberOfSteps] = input.terminalValues.map((value, index) =>
    finiteNumber(value, `terminalValues[${index}]`),
  );

  for (let timeIndex = numberOfSteps - 1; timeIndex >= 0; timeIndex -= 1) {
    const step = input.steps[timeIndex];
    const nodeCount = timeIndex + 1;
    if (
      step.discountFactors.length !== nodeCount ||
      step.riskNeutralUpProbabilities.length !== nodeCount
    ) {
      throw new RangeError(
        `steps[${timeIndex}] must contain ${nodeCount} nodes`,
      );
    }
    const nextCashFlows = input.cashFlowsAtTimes?.[timeIndex];
    if (nextCashFlows !== undefined && nextCashFlows.length !== nodeCount + 1) {
      throw new RangeError(
        `cashFlowsAtTimes[${timeIndex}] must contain ${nodeCount + 1} nodes`,
      );
    }

    valuesByTime[timeIndex] = Array.from({ length: nodeCount }, (_, node) => {
      const discountFactor = positiveNumber(
        step.discountFactors[node],
        `steps[${timeIndex}].discountFactors[${node}]`,
      );
      const upProbability = unitIntervalNumber(
        step.riskNeutralUpProbabilities[node],
        `steps[${timeIndex}].riskNeutralUpProbabilities[${node}]`,
      );
      const downProbability = 1 - upProbability;
      const downValue =
        valuesByTime[timeIndex + 1][node] + (nextCashFlows?.[node] ?? 0);
      const upValue =
        valuesByTime[timeIndex + 1][node + 1] +
        (nextCashFlows?.[node + 1] ?? 0);
      return finiteNumber(
        discountFactor *
          (downProbability * downValue + upProbability * upValue),
        `valuesByTime[${timeIndex}][${node}]`,
      );
    });
  }

  return { valuesByTime, valueNow: valuesByTime[0][0] };
}
