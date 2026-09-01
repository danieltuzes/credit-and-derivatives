import { finiteNumber, nonNegativeNumber } from '../scalars';

const MILLISECONDS_PER_DAY = 86_400_000;

function utcDateOnly(value: string, label: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`${label} must use YYYY-MM-DD`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`${label} must be a valid UTC calendar date`);
  }
  return timestamp;
}

export interface ActualActualCouponPeriodInput {
  readonly previousCouponDate: string;
  readonly settlementDate: string;
  readonly nextCouponDate: string;
  /** Currency paid for the complete coupon period. */
  readonly couponPayment: number;
}

export interface ActualActualCouponPeriodAccrual {
  readonly elapsedDays: number;
  readonly couponPeriodDays: number;
  readonly accruedFraction: number;
  readonly accruedInterest: number;
}

/**
 * Actual/actual within one regular coupon period. Dates are unadjusted UTC date
 * labels; this function does not implement business-day or ex-coupon rules.
 */
export function actualActualCouponPeriodAccrual(
  input: ActualActualCouponPeriodInput,
): ActualActualCouponPeriodAccrual {
  const previous = utcDateOnly(input.previousCouponDate, 'previousCouponDate');
  const settlement = utcDateOnly(input.settlementDate, 'settlementDate');
  const next = utcDateOnly(input.nextCouponDate, 'nextCouponDate');
  const couponPayment = nonNegativeNumber(input.couponPayment, 'couponPayment');

  if (previous > settlement || settlement >= next) {
    throw new RangeError(
      'dates must satisfy previousCouponDate <= settlementDate < nextCouponDate',
    );
  }

  const elapsedDays = (settlement - previous) / MILLISECONDS_PER_DAY;
  const couponPeriodDays = (next - previous) / MILLISECONDS_PER_DAY;
  const accruedFraction = finiteNumber(
    elapsedDays / couponPeriodDays,
    'accrued fraction',
  );
  const accruedInterest = finiteNumber(
    couponPayment * accruedFraction,
    'accrued interest',
  );

  return { elapsedDays, couponPeriodDays, accruedFraction, accruedInterest };
}

export function dirtyPriceFromClean(
  cleanPrice: number,
  accruedInterest: number,
): number {
  return nonNegativeNumber(
    nonNegativeNumber(cleanPrice, 'cleanPrice') +
      nonNegativeNumber(accruedInterest, 'accruedInterest'),
    'dirty price',
  );
}

export function cleanPriceFromDirty(
  dirtyPrice: number,
  accruedInterest: number,
): number {
  return nonNegativeNumber(
    nonNegativeNumber(dirtyPrice, 'dirtyPrice') -
      nonNegativeNumber(accruedInterest, 'accruedInterest'),
    'clean price',
  );
}
