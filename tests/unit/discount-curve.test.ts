import { describe, expect, it } from 'vitest';
import {
  continuousForwardRate,
  continuousZeroRate,
  createLogLinearDiscountCurve,
  forwardDiscountFactor,
} from '../../content/domain/rates/discount-curve';

describe('log-linear discount curve', () => {
  it('preserves nodes and interpolates the logarithm of discount factors', () => {
    const curve = createLogLinearDiscountCurve([
      { timeYears: 0.5, discountFactor: 0.98 },
      { timeYears: 1, discountFactor: 0.95 },
    ]);

    expect(curve.discountFactorAt(0)).toBe(1);
    expect(curve.discountFactorAt(0.5)).toBe(0.98);
    expect(curve.discountFactorAt(0.75)).toBeCloseTo(
      Math.sqrt(0.98 * 0.95),
      14,
    );
    expect(curve.discountFactorAt(1)).toBe(0.95);
  });

  it('derives forward discount factors and continuous rates consistently', () => {
    const curve = createLogLinearDiscountCurve([
      { timeYears: 1, discountFactor: Math.exp(-0.02) },
      { timeYears: 3, discountFactor: Math.exp(-0.1) },
    ]);

    expect(continuousZeroRate(curve, 1)).toBeCloseTo(0.02, 14);
    expect(forwardDiscountFactor(curve, 1, 3)).toBeCloseTo(Math.exp(-0.08), 14);
    expect(continuousForwardRate(curve, 1, 3)).toBeCloseTo(0.04, 14);
  });

  it('allows discount factors above one and therefore negative rates', () => {
    const curve = createLogLinearDiscountCurve([
      { timeYears: 1, discountFactor: 1.01 },
    ]);
    expect(continuousZeroRate(curve, 1)).toBeLessThan(0);
  });

  it('rejects unordered nodes, non-positive factors, and extrapolation', () => {
    expect(() =>
      createLogLinearDiscountCurve([
        { timeYears: 1, discountFactor: 0.95 },
        { timeYears: 1, discountFactor: 0.94 },
      ]),
    ).toThrow(/strictly increasing/);
    expect(() =>
      createLogLinearDiscountCurve([{ timeYears: 1, discountFactor: 0 }]),
    ).toThrow(/discountFactor/);

    const curve = createLogLinearDiscountCurve([
      { timeYears: 1, discountFactor: 0.95 },
    ]);
    expect(() => curve.discountFactorAt(1.1)).toThrow(/within/);
    expect(() => forwardDiscountFactor(curve, 1, 1)).toThrow(/precede/);
    expect(() => continuousZeroRate(curve, 0)).toThrow(/timeYears/);
  });
});
