import { describe, expect, it } from 'vitest';
import {
  valueDefaultKnockoutBondOption,
  type DefaultKnockoutBondOptionInput,
} from '../../src/domain/bonds/default-knockout-option';

const baseInput: DefaultKnockoutBondOptionInput = {
  timesYears: [0, 1, 2, 3],
  steps: [
    {
      discountFactors: [0.95],
      riskNeutralUpProbabilities: [0.5],
      conditionalSurvivalProbabilities: [0.9],
      recoveriesOnDefault: [40],
    },
    {
      discountFactors: [0.94, 0.93],
      riskNeutralUpProbabilities: [0.4, 0.6],
      conditionalSurvivalProbabilities: [0.8, 0.9],
      recoveriesOnDefault: [40, 40],
    },
    {
      discountFactors: [0.92, 0.91, 0.9],
      riskNeutralUpProbabilities: [0.5, 0.5, 0.5],
      conditionalSurvivalProbabilities: [0.7, 0.8, 0.9],
      recoveriesOnDefault: [40, 40, 40],
    },
  ],
  scheduledSurvivalCashFlows: [5, 5, 105],
  optionExpiryTimeIndex: 2,
  optionKind: 'call',
  strikePrice: 82,
};

describe('issuer-default knockout bond option', () => {
  it('values the alive bond and then extinguishes option value on pre-expiry default', () => {
    const result = valueDefaultKnockoutBondOption(baseInput);

    expect(result.aliveBondValuesByTime[2]).toEqual([78.66, 83.72, 88.65]);
    expect(result.aliveBondValuesByTime[1][0]).toBeCloseTo(71.954368, 12);
    expect(result.aliveBondValuesByTime[1][1]).toBeCloseTo(80.454486, 12);
    expect(result.bondValueNow).toBeCloseTo(73.229785085, 12);
    expect(result.aliveOptionValuesByTime[2]).toEqual([
      0, 1.7199999999999989, 6.650000000000006,
    ]);
    expect(result.optionValueNow).toBeCloseTo(1.895048505, 12);
  });

  it('separates positive bond recovery from the option knockout payoff', () => {
    const result = valueDefaultKnockoutBondOption({
      ...baseInput,
      steps: [
        {
          ...baseInput.steps[0],
          conditionalSurvivalProbabilities: [0],
        },
        ...baseInput.steps.slice(1),
      ],
    });

    expect(result.bondValueNow).toBe(38);
    expect(result.optionValueNow).toBe(0);
  });

  it('reduces to a default-free bond option when survival is one', () => {
    const defaultFree = valueDefaultKnockoutBondOption({
      ...baseInput,
      steps: baseInput.steps.map((step) => ({
        ...step,
        conditionalSurvivalProbabilities:
          step.conditionalSurvivalProbabilities.map(() => 1),
        recoveriesOnDefault: step.recoveriesOnDefault.map(() => 0),
      })),
    });
    const creditRisky = valueDefaultKnockoutBondOption(baseInput);

    expect(defaultFree.optionValueNow).toBeGreaterThan(
      creditRisky.optionValueNow,
    );
  });

  it('rejects bad expiry placement and malformed node rows', () => {
    expect(() =>
      valueDefaultKnockoutBondOption({
        ...baseInput,
        optionExpiryTimeIndex: 3,
      }),
    ).toThrow(/before bond maturity/);
    expect(() =>
      valueDefaultKnockoutBondOption({
        ...baseInput,
        steps: [
          baseInput.steps[0],
          { ...baseInput.steps[1], discountFactors: [0.94] },
          baseInput.steps[2],
        ],
      }),
    ).toThrow(/steps\[1\]/);
  });
});
