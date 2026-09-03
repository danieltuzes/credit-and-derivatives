type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type FiniteNumber = Brand<number, 'FiniteNumber'>;
export type PositiveNumber = Brand<number, 'PositiveNumber'>;
export type NonNegativeNumber = Brand<number, 'NonNegativeNumber'>;
export type UnitIntervalNumber = Brand<number, 'UnitIntervalNumber'>;
export type PaymentFrequency = 1 | 2 | 4;

export function finiteNumber(value: number, label = 'value'): FiniteNumber {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite`);
  }
  return value as FiniteNumber;
}

export function positiveNumber(value: number, label = 'value'): PositiveNumber {
  finiteNumber(value, label);
  if (value <= 0) {
    throw new RangeError(`${label} must be greater than zero`);
  }
  return value as PositiveNumber;
}

export function nonNegativeNumber(
  value: number,
  label = 'value',
): NonNegativeNumber {
  finiteNumber(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative`);
  }
  return value as NonNegativeNumber;
}

export function unitIntervalNumber(
  value: number,
  label = 'value',
): UnitIntervalNumber {
  finiteNumber(value, label);
  if (value < 0 || value > 1) {
    throw new RangeError(`${label} must be between zero and one inclusive`);
  }
  return value as UnitIntervalNumber;
}

export function paymentFrequency(value: number): PaymentFrequency {
  if (value === 1 || value === 2 || value === 4) {
    return value;
  }
  throw new RangeError('paymentFrequency must be 1, 2, or 4');
}
