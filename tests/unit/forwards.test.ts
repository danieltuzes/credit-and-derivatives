import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  fairForwardDeliveryPrice,
  longForwardContractValue,
  prepaidForwardPrice,
  shortForwardContractValue,
} from '../../content/domain/derivatives/forwards';

describe('forward contracts', () => {
  it('prices no-income and known-income forwards from cash and carry', () => {
    expect(
      fairForwardDeliveryPrice({
        spotPrice: 100,
        incomePresentValue: 0,
        discountFactorToDelivery: 0.95,
      }),
    ).toBeCloseTo(105.2631578947, 10);
    expect(
      fairForwardDeliveryPrice({
        spotPrice: 100,
        incomePresentValue: 4,
        discountFactorToDelivery: 0.95,
      }),
    ).toBeCloseTo(101.0526315789, 10);
  });

  it('gives a newly struck fair forward zero value', () => {
    const fairPrice = fairForwardDeliveryPrice({
      spotPrice: 930,
      incomePresentValue: 0,
      discountFactorToDelivery: 0.98,
    });
    expect(
      longForwardContractValue({
        currentForwardPrice: fairPrice,
        deliveryPrice: fairPrice,
        discountFactorToDelivery: 0.98,
      }),
    ).toBe(0);
  });

  it('keeps long and short values opposite and scales by quantity', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.1, max: 2, noNaN: true, noDefaultInfinity: true }),
        fc.double({
          min: 0.01,
          max: 1_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (currentForwardPrice, deliveryPrice, discountFactor, quantity) => {
          const input = {
            currentForwardPrice,
            deliveryPrice,
            discountFactorToDelivery: discountFactor,
            quantity,
          };
          const long = longForwardContractValue(input);
          const short = shortForwardContractValue(input);
          return Math.abs(long + short) <= 1e-10 * Math.max(1, Math.abs(long));
        },
      ),
    );
  });

  it('rejects invalid carry and valuation inputs', () => {
    expect(() =>
      prepaidForwardPrice({ spotPrice: 10, incomePresentValue: 11 }),
    ).toThrow(/must not exceed/);
    expect(() =>
      fairForwardDeliveryPrice({
        spotPrice: 10,
        incomePresentValue: 0,
        discountFactorToDelivery: 0,
      }),
    ).toThrow(/discountFactorToDelivery/);
    expect(() =>
      longForwardContractValue({
        currentForwardPrice: 10,
        deliveryPrice: 9,
        discountFactorToDelivery: 1,
        quantity: 0,
      }),
    ).toThrow(/quantity/);
  });
});
