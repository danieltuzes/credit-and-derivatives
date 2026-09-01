import { describe, expect, it } from 'vitest';
import {
  actualActualCouponPeriodAccrual,
  cleanPriceFromDirty,
  dirtyPriceFromClean,
} from '../../src/domain/bonds/settlement';

describe('bond settlement conventions', () => {
  it('matches an actual/actual coupon-period example', () => {
    const result = actualActualCouponPeriodAccrual({
      previousCouponDate: '2021-02-15',
      settlementDate: '2021-05-17',
      nextCouponDate: '2021-08-15',
      couponPayment: 31.25,
    });

    expect(result.elapsedDays).toBe(91);
    expect(result.couponPeriodDays).toBe(181);
    expect(result.accruedFraction).toBeCloseTo(91 / 181, 14);
    expect(result.accruedInterest).toBeCloseTo(31.25 * (91 / 181), 14);
  });

  it('sets accrued interest to zero on the previous coupon date', () => {
    expect(
      actualActualCouponPeriodAccrual({
        previousCouponDate: '2024-02-29',
        settlementDate: '2024-02-29',
        nextCouponDate: '2024-08-31',
        couponPayment: 20,
      }).accruedInterest,
    ).toBe(0);
  });

  it('converts exactly between clean and dirty currency prices', () => {
    const dirty = dirtyPriceFromClean(9178.125, 15.711);
    expect(dirty).toBeCloseTo(9193.836, 12);
    expect(cleanPriceFromDirty(dirty, 15.711)).toBeCloseTo(9178.125, 12);
  });

  it('rejects invalid dates, date order, and negative accrued interest', () => {
    expect(() =>
      actualActualCouponPeriodAccrual({
        previousCouponDate: '2023-02-29',
        settlementDate: '2023-03-01',
        nextCouponDate: '2023-08-31',
        couponPayment: 20,
      }),
    ).toThrow(/valid UTC/);
    expect(() =>
      actualActualCouponPeriodAccrual({
        previousCouponDate: '2024-01-01',
        settlementDate: '2024-07-01',
        nextCouponDate: '2024-07-01',
        couponPayment: 20,
      }),
    ).toThrow(/dates must satisfy/);
    expect(() => dirtyPriceFromClean(100, -1)).toThrow(/accruedInterest/);
    expect(() => dirtyPriceFromClean(-1, 0)).toThrow(/cleanPrice/);
    expect(() => cleanPriceFromDirty(10, 11)).toThrow(/clean price/);
  });
});
