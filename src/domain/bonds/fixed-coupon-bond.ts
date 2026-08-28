import {
  periodicDiscountFactor,
  presentValue,
  type CashFlow,
} from '../present-value';
import {
  nonNegativeNumber,
  paymentFrequency,
  positiveNumber,
  type NonNegativeNumber,
  type PaymentFrequency,
  type PositiveNumber,
} from '../scalars';

export interface FixedCouponBondInput {
  readonly faceValue: number;
  readonly annualCouponRate: number;
  readonly termYears: number;
  readonly paymentFrequency: number;
}

export interface FixedCouponBond {
  readonly faceValue: PositiveNumber;
  readonly annualCouponRate: NonNegativeNumber;
  readonly termYears: PositiveNumber;
  readonly paymentFrequency: PaymentFrequency;
  readonly numberOfPayments: number;
}

/**
 * Simplified teaching convention: level coupons, redemption at par,
 * settlement on a coupon date, and no default, accrued interest, tax,
 * liquidity effect, or embedded option.
 */
export function createFixedCouponBond(
  input: FixedCouponBondInput,
): FixedCouponBond {
  const faceValue = positiveNumber(input.faceValue, 'faceValue');
  const annualCouponRate = nonNegativeNumber(
    input.annualCouponRate,
    'annualCouponRate',
  );
  const termYears = positiveNumber(input.termYears, 'termYears');
  const frequency = paymentFrequency(input.paymentFrequency);
  const rawPayments = termYears * frequency;
  const numberOfPayments = Math.round(rawPayments);

  if (Math.abs(rawPayments - numberOfPayments) > 1e-10) {
    throw new RangeError(
      'termYears must contain a whole number of coupon periods',
    );
  }

  return {
    faceValue,
    annualCouponRate,
    termYears,
    paymentFrequency: frequency,
    numberOfPayments,
  };
}

export function fixedCouponCashFlows(
  bond: FixedCouponBond,
): readonly CashFlow[] {
  const coupon =
    (bond.faceValue * bond.annualCouponRate) / bond.paymentFrequency;

  return Array.from({ length: bond.numberOfPayments }, (_, index) => ({
    timeYears: (index + 1) / bond.paymentFrequency,
    amount: coupon + (index === bond.numberOfPayments - 1 ? bond.faceValue : 0),
  }));
}

/**
 * Yield is a nominal annual decimal rate compounded at the coupon frequency.
 */
export function priceFixedCouponBond(
  bond: FixedCouponBond,
  yieldToMaturity: number,
): number {
  return presentValue(
    fixedCouponCashFlows(bond),
    periodicDiscountFactor(yieldToMaturity, bond.paymentFrequency),
  );
}

export function macaulayDuration(
  bond: FixedCouponBond,
  yieldToMaturity: number,
): number {
  const discountFactor = periodicDiscountFactor(
    yieldToMaturity,
    bond.paymentFrequency,
  );
  const cashFlows = fixedCouponCashFlows(bond);
  const price = presentValue(cashFlows, discountFactor);

  return (
    cashFlows.reduce(
      (weightedValue, cashFlow) =>
        weightedValue +
        cashFlow.timeYears *
          cashFlow.amount *
          discountFactor(cashFlow.timeYears),
      0,
    ) / price
  );
}
