import {
  finiteNumber,
  nonNegativeNumber,
  positiveNumber,
} from '../scalars';

export type EuropeanOptionKind = 'call' | 'put';

export interface EuropeanOptionPayoffInput {
  readonly kind: EuropeanOptionKind;
  readonly underlyingPriceAtExpiry: number;
  readonly strikePrice: number;
  readonly quantity?: number;
}

export interface PutCallParityInput {
  readonly callValue: number;
  readonly putValue: number;
  /** Spot less PV of deterministic income before option expiry. */
  readonly prepaidForwardPrice: number;
  readonly strikePrice: number;
  readonly discountFactorToExpiry: number;
}

/** Non-negative expiry payoff to the holder of a European call or put. */
export function europeanOptionPayoff(input: EuropeanOptionPayoffInput): number {
  const underlying = nonNegativeNumber(
    input.underlyingPriceAtExpiry,
    'underlyingPriceAtExpiry',
  );
  const strike = nonNegativeNumber(input.strikePrice, 'strikePrice');
  const quantity = positiveNumber(input.quantity ?? 1, 'quantity');

  const unitPayoff =
    input.kind === 'call'
      ? Math.max(underlying - strike, 0)
      : Math.max(strike - underlying, 0);

  if (input.kind !== 'call' && input.kind !== 'put') {
    throw new RangeError('kind must be "call" or "put"');
  }

  return finiteNumber(quantity * unitPayoff, `${input.kind} payoff`);
}

/** Signed payoff to the writer, opposite to the holder's payoff. */
export function europeanOptionWriterPayoff(
  input: EuropeanOptionPayoffInput,
): number {
  return finiteNumber(-europeanOptionPayoff(input), 'option writer payoff');
}

/**
 * Left side minus right side of European put-call parity:
 * C - P - (prepaid forward - K D(0,T)).
 */
export function putCallParityResidual(input: PutCallParityInput): number {
  const call = nonNegativeNumber(input.callValue, 'callValue');
  const put = nonNegativeNumber(input.putValue, 'putValue');
  const prepaid = nonNegativeNumber(
    input.prepaidForwardPrice,
    'prepaidForwardPrice',
  );
  const strike = nonNegativeNumber(input.strikePrice, 'strikePrice');
  const discountFactor = positiveNumber(
    input.discountFactorToExpiry,
    'discountFactorToExpiry',
  );

  return finiteNumber(
    call - put - (prepaid - strike * discountFactor),
    'put-call parity residual',
  );
}

/** Put value implied by European put-call parity. */
export function putValueFromParity(input: Omit<PutCallParityInput, 'putValue'>) {
  const call = nonNegativeNumber(input.callValue, 'callValue');
  const prepaid = nonNegativeNumber(
    input.prepaidForwardPrice,
    'prepaidForwardPrice',
  );
  const strike = nonNegativeNumber(input.strikePrice, 'strikePrice');
  const discountFactor = positiveNumber(
    input.discountFactorToExpiry,
    'discountFactorToExpiry',
  );

  return nonNegativeNumber(
    call - prepaid + strike * discountFactor,
    'put value implied by parity',
  );
}
