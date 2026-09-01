import { describe, expect, it } from 'vitest';
import {
  finiteStateRiskNeutralValue,
  onePeriodBinomialClaimValue,
} from '../../src/domain/valuation/finite-state';

describe('finite-state valuation', () => {
  it('discounts a signed risk-neutral expected payoff', () => {
    expect(
      finiteStateRiskNeutralValue(
        [
          { probability: 0.25, payoff: 120 },
          { probability: 0.75, payoff: 40 },
        ],
        0.95,
      ),
    ).toBeCloseTo(57, 12);
  });

  it('matches a hand-calculated one-period call by replication and Q weighting', () => {
    const value = onePeriodBinomialClaimValue({
      underlyingValueNow: 100,
      underlyingValueUp: 120,
      underlyingValueDown: 80,
      payoffUp: 20,
      payoffDown: 0,
      discountFactorToExpiry: 1 / 1.05,
    });

    expect(value.riskNeutralUpProbability).toBeCloseTo(0.625, 12);
    expect(value.hedgeUnits).toBeCloseTo(0.5, 12);
    expect(value.riskFreeCashAtExpiry).toBeCloseTo(-40, 12);
    expect(value.replicationValue).toBeCloseTo(11.9047619048, 10);
    expect(value.riskNeutralValue).toBeCloseTo(value.replicationValue, 12);
  });

  it('supports signed state payoffs', () => {
    expect(
      finiteStateRiskNeutralValue(
        [
          { probability: 0.2, payoff: 200 },
          { probability: 0.5, payoff: 50 },
          { probability: 0.3, payoff: -40 },
        ],
        0.94,
      ),
    ).toBeCloseTo(49.82, 12);
  });

  it('rejects incomplete probabilities and an arbitrage-inconsistent tree', () => {
    expect(() =>
      finiteStateRiskNeutralValue(
        [
          { probability: 0.4, payoff: 1 },
          { probability: 0.4, payoff: 2 },
        ],
        1,
      ),
    ).toThrow(/sum to one/);
    expect(() =>
      onePeriodBinomialClaimValue({
        underlyingValueNow: 200,
        underlyingValueUp: 120,
        underlyingValueDown: 80,
        payoffUp: 20,
        payoffDown: 0,
        discountFactorToExpiry: 1,
      }),
    ).toThrow(/riskNeutralUpProbability/);
  });
});
