import { finiteNumber, nonNegativeNumber } from '../scalars';

/**
 * Model survival probability conditional on survival at valuation time.
 * Time is measured in model years from valuation time zero.
 */
export type SurvivalProbability = (timeYears: number) => number;

/**
 * Constant continuously compounded hazard in inverse model years.
 * The returned curve is S(0,t) = exp(-annualHazardRate * t).
 */
export function constantHazardSurvivalProbability(
  annualHazardRate: number,
): SurvivalProbability {
  const hazardRate = nonNegativeNumber(annualHazardRate, 'annualHazardRate');

  return (timeYears) => {
    const time = nonNegativeNumber(timeYears, 'timeYears');
    return finiteNumber(Math.exp(-hazardRate * time), 'survival probability');
  };
}
