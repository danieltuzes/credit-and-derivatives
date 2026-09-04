import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { constantHazardSurvivalProbability } from '../../content/domain/credit/survival';

function expectRelativeClose(
  actual: number,
  expected: number,
  tolerance = 1e-12,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
}

describe('constant hazard survival probability', () => {
  it('matches a reference value and starts at one', () => {
    const survivalProbability = constantHazardSurvivalProbability(0.03);

    expect(survivalProbability(0)).toBe(1);
    expectRelativeClose(survivalProbability(5), Math.exp(-0.03 * 5));
  });

  it('is one at every time when hazard is zero', () => {
    const survivalProbability = constantHazardSurvivalProbability(0);

    for (const timeYears of [0, 0.25, 1, 10, 100]) {
      expect(survivalProbability(timeYears)).toBe(1);
    }
  });

  it('obeys the constant-hazard semigroup identity', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 20, noNaN: true }),
        fc.double({ min: 0, max: 20, noNaN: true }),
        (annualHazardRate, firstTime, secondTime) => {
          const survivalProbability =
            constantHazardSurvivalProbability(annualHazardRate);
          expectRelativeClose(
            survivalProbability(firstTime + secondTime),
            survivalProbability(firstTime) * survivalProbability(secondTime),
            2e-12,
          );
        },
      ),
      { numRuns: 250 },
    );
  });

  it('stays in bounds, decreases through time, and decreases with hazard', () => {
    const lowHazard = constantHazardSurvivalProbability(0.01);
    const highHazard = constantHazardSurvivalProbability(0.08);
    const times = [0, 0.25, 1, 3, 10, 30];

    for (let index = 0; index < times.length; index += 1) {
      const timeYears = times[index];
      const value = lowHazard(timeYears);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(highHazard(timeYears)).toBeLessThanOrEqual(value);
      if (index > 0) {
        expect(value).toBeLessThanOrEqual(lowHazard(times[index - 1]));
      }
    }
  });

  it('rejects invalid hazards and times', () => {
    for (const annualHazardRate of [
      -0.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() => constantHazardSurvivalProbability(annualHazardRate)).toThrow(
        /annualHazardRate/,
      );
    }

    const survivalProbability = constantHazardSurvivalProbability(0.03);
    for (const timeYears of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => survivalProbability(timeYears)).toThrow(/timeYears/);
    }
  });
});
