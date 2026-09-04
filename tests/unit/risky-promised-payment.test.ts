import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { valueRiskyPromisedPaymentWithRecoveryAtMaturity } from '../../content/domain/credit/risky-promised-payment';

function expectRelativeClose(
  actual: number,
  expected: number,
  tolerance = 1e-12,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
}

describe('risky promised payment with recovery at maturity', () => {
  it('matches a one-period reference calculation', () => {
    const value = valueRiskyPromisedPaymentWithRecoveryAtMaturity({
      promisedAmount: 100,
      survivalProbabilityAtMaturity: 0.9,
      recoveryRate: 0.4,
      discountFactorToMaturity: 0.95,
    });

    expectRelativeClose(value.survivalComponentPresentValue, 85.5);
    expectRelativeClose(value.recoveryAtMaturityComponentPresentValue, 3.8);
    expectRelativeClose(value.totalPresentValue, 89.3);
  });

  it('matches the survival, certain-default, zero-recovery, and full-recovery limits', () => {
    expect(
      valueRiskyPromisedPaymentWithRecoveryAtMaturity({
        promisedAmount: 100,
        survivalProbabilityAtMaturity: 1,
        recoveryRate: 0.4,
        discountFactorToMaturity: 0.9,
      }),
    ).toEqual({
      survivalComponentPresentValue: 90,
      recoveryAtMaturityComponentPresentValue: 0,
      totalPresentValue: 90,
    });

    const certainDefault = valueRiskyPromisedPaymentWithRecoveryAtMaturity({
      promisedAmount: 100,
      survivalProbabilityAtMaturity: 0,
      recoveryRate: 0.4,
      discountFactorToMaturity: 0.9,
    });
    expect(certainDefault.survivalComponentPresentValue).toBe(0);
    expectRelativeClose(
      certainDefault.recoveryAtMaturityComponentPresentValue,
      36,
    );
    expectRelativeClose(certainDefault.totalPresentValue, 36);

    const zeroRecovery = valueRiskyPromisedPaymentWithRecoveryAtMaturity({
      promisedAmount: 100,
      survivalProbabilityAtMaturity: 0.75,
      recoveryRate: 0,
      discountFactorToMaturity: 0.9,
    });
    expect(zeroRecovery.recoveryAtMaturityComponentPresentValue).toBe(0);
    expectRelativeClose(zeroRecovery.totalPresentValue, 67.5);

    const fullRecovery = valueRiskyPromisedPaymentWithRecoveryAtMaturity({
      promisedAmount: 100,
      survivalProbabilityAtMaturity: 0.25,
      recoveryRate: 1,
      discountFactorToMaturity: 0.9,
    });
    expectRelativeClose(fullRecovery.totalPresentValue, 90);
  });

  it('scales linearly with promised amount and discount factor', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 2, noNaN: true }),
        (promisedAmount, survivalProbability, recoveryRate, discountFactor) => {
          const value = valueRiskyPromisedPaymentWithRecoveryAtMaturity({
            promisedAmount,
            survivalProbabilityAtMaturity: survivalProbability,
            recoveryRate,
            discountFactorToMaturity: discountFactor,
          });
          const expected =
            promisedAmount *
            discountFactor *
            (survivalProbability + recoveryRate * (1 - survivalProbability));
          expectRelativeClose(value.totalPresentValue, expected, 2e-11);
          expectRelativeClose(
            value.totalPresentValue,
            value.survivalComponentPresentValue +
              value.recoveryAtMaturityComponentPresentValue,
            2e-11,
          );
        },
      ),
      { numRuns: 250 },
    );
  });

  it('rejects invalid amounts, probabilities, recovery, discount factors, and overflow', () => {
    const base = {
      promisedAmount: 100,
      survivalProbabilityAtMaturity: 0.9,
      recoveryRate: 0.4,
      discountFactorToMaturity: 0.95,
    };

    for (const promisedAmount of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() =>
        valueRiskyPromisedPaymentWithRecoveryAtMaturity({
          ...base,
          promisedAmount,
        }),
      ).toThrow(/promisedAmount/);
    }
    for (const survivalProbabilityAtMaturity of [
      -0.01,
      1.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() =>
        valueRiskyPromisedPaymentWithRecoveryAtMaturity({
          ...base,
          survivalProbabilityAtMaturity,
        }),
      ).toThrow(/survivalProbabilityAtMaturity/);
    }
    for (const recoveryRate of [
      -0.01,
      1.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() =>
        valueRiskyPromisedPaymentWithRecoveryAtMaturity({
          ...base,
          recoveryRate,
        }),
      ).toThrow(/recoveryRate/);
    }
    for (const discountFactorToMaturity of [
      -0.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() =>
        valueRiskyPromisedPaymentWithRecoveryAtMaturity({
          ...base,
          discountFactorToMaturity,
        }),
      ).toThrow(/discountFactorToMaturity/);
    }
    expect(() =>
      valueRiskyPromisedPaymentWithRecoveryAtMaturity({
        ...base,
        promisedAmount: Number.MAX_VALUE,
        survivalProbabilityAtMaturity: 1,
        discountFactorToMaturity: 2,
      }),
    ).toThrow(/finite/);
  });
});
