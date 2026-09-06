import { describe, expect, it } from 'vitest';
import { europeanOptionPayoff } from '../../content/domain/derivatives/european-options';
import { backwardInductionValue } from '../../content/domain/valuation/recombining-lattice';

describe('recombining lattice backward induction', () => {
  it('reproduces the European bond-call worked example', () => {
    const terminalValues = [90, 110].map((underlyingPriceAtExpiry) =>
      europeanOptionPayoff({
        kind: 'call',
        underlyingPriceAtExpiry,
        strikePrice: 100,
      }),
    );
    const result = backwardInductionValue({
      steps: [{ discountFactors: [0.95], riskNeutralUpProbabilities: [0.6] }],
      terminalValues,
    });

    expect(terminalValues).toEqual([0, 10]);
    expect(result.valueNow).toBeCloseTo(5.7, 14);
  });

  it('values a two-step claim from terminal node values', () => {
    const result = backwardInductionValue({
      steps: [
        { discountFactors: [0.95], riskNeutralUpProbabilities: [0.5] },
        {
          discountFactors: [0.9, 0.9],
          riskNeutralUpProbabilities: [0.25, 0.75],
        },
      ],
      terminalValues: [0, 20, 40],
    });

    expect(result.valuesByTime).toEqual([
      [17.099999999999998],
      [4.5, 31.5],
      [0, 20, 40],
    ]);
    expect(result.valueNow).toBeCloseTo(17.1, 14);
  });

  it('adds next-date cash flows before discounting', () => {
    const result = backwardInductionValue({
      steps: [{ discountFactors: [0.9], riskNeutralUpProbabilities: [0.4] }],
      terminalValues: [10, 20],
      cashFlowsAtTimes: [[5, 5]],
    });
    expect(result.valueNow).toBeCloseTo(17.1, 14);
  });

  it('rejects malformed trees and invalid pricing inputs', () => {
    expect(() =>
      backwardInductionValue({
        steps: [{ discountFactors: [0.9], riskNeutralUpProbabilities: [0.5] }],
        terminalValues: [1],
      }),
    ).toThrow(/terminalValues/);
    expect(() =>
      backwardInductionValue({
        steps: [{ discountFactors: [0], riskNeutralUpProbabilities: [0.5] }],
        terminalValues: [1, 2],
      }),
    ).toThrow(/discountFactors/);
    expect(() =>
      backwardInductionValue({
        steps: [{ discountFactors: [0.9], riskNeutralUpProbabilities: [1.1] }],
        terminalValues: [1, 2],
      }),
    ).toThrow(/riskNeutralUpProbabilities/);
  });
});
