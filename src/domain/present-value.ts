import { finiteNumber, nonNegativeNumber, positiveNumber } from './scalars';

export interface CashFlow {
  readonly timeYears: number;
  readonly amount: number;
}

export type DiscountFactor = (timeYears: number) => number;

export function presentValue(
  cashFlows: readonly CashFlow[],
  discountFactor: DiscountFactor,
): number {
  let sum = 0;
  let correction = 0;

  for (const [index, cashFlow] of cashFlows.entries()) {
    nonNegativeNumber(cashFlow.timeYears, `cashFlows[${index}].timeYears`);
    finiteNumber(cashFlow.amount, `cashFlows[${index}].amount`);

    const factor = discountFactor(cashFlow.timeYears);
    nonNegativeNumber(factor, `discountFactor(${cashFlow.timeYears})`);
    const term = finiteNumber(
      cashFlow.amount * factor,
      `discounted cash flow ${index}`,
    );

    // Neumaier-style compensation limits avoidable floating-point loss when
    // lessons later combine cash flows of very different sizes.
    const adjusted = term - correction;
    const next = sum + adjusted;
    correction = next - sum - adjusted;
    sum = next;
  }

  return finiteNumber(sum, 'present value');
}

export function periodicDiscountFactor(
  nominalAnnualRate: number,
  periodsPerYear: number,
): DiscountFactor {
  finiteNumber(nominalAnnualRate, 'nominalAnnualRate');
  positiveNumber(periodsPerYear, 'periodsPerYear');

  if (!Number.isInteger(periodsPerYear)) {
    throw new RangeError('periodsPerYear must be an integer');
  }

  const base = 1 + nominalAnnualRate / periodsPerYear;
  if (base <= 0) {
    throw new RangeError(
      'nominalAnnualRate must be greater than -periodsPerYear',
    );
  }

  return (timeYears) => {
    nonNegativeNumber(timeYears, 'timeYears');
    return finiteNumber(
      base ** (-periodsPerYear * timeYears),
      'discount factor',
    );
  };
}
