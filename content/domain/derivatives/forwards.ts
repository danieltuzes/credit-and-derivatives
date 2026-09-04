import { finiteNumber, nonNegativeNumber, positiveNumber } from '../scalars';

export interface FairForwardDeliveryPriceInput {
  /** Current full price of one unit of the underlying, in valuation-time currency. */
  readonly spotPrice: number;
  /** PV of deterministic income paid by the underlying before delivery. */
  readonly incomePresentValue: number;
  /** Valuation-time currency per one delivery-time currency unit. */
  readonly discountFactorToDelivery: number;
}

export interface ForwardContractValueInput {
  /** Forward price for a new contract with the same delivery date. */
  readonly currentForwardPrice: number;
  /** Delivery price fixed in the existing contract. */
  readonly deliveryPrice: number;
  /** Valuation-time currency per one delivery-time currency unit. */
  readonly discountFactorToDelivery: number;
  /** Positive number of underlying units in the contract; defaults to one. */
  readonly quantity?: number;
}

/**
 * Prepaid forward price under a known-income cash-and-carry model.
 * Income and spot must use the same valuation time, currency, and price basis.
 */
export function prepaidForwardPrice(
  input: Pick<
    FairForwardDeliveryPriceInput,
    'spotPrice' | 'incomePresentValue'
  >,
): number {
  const spotPrice = nonNegativeNumber(input.spotPrice, 'spotPrice');
  const incomePresentValue = nonNegativeNumber(
    input.incomePresentValue,
    'incomePresentValue',
  );

  if (incomePresentValue > spotPrice) {
    throw new RangeError('incomePresentValue must not exceed spotPrice');
  }

  return finiteNumber(spotPrice - incomePresentValue, 'prepaid forward price');
}

/** Fair delivery price for a newly struck forward, so inception value is zero. */
export function fairForwardDeliveryPrice(
  input: FairForwardDeliveryPriceInput,
): number {
  const discountFactor = positiveNumber(
    input.discountFactorToDelivery,
    'discountFactorToDelivery',
  );
  return finiteNumber(
    prepaidForwardPrice(input) / discountFactor,
    'fair forward delivery price',
  );
}

/** Value to the long of an existing forward under deterministic discounting. */
export function longForwardContractValue(
  input: ForwardContractValueInput,
): number {
  const currentForwardPrice = nonNegativeNumber(
    input.currentForwardPrice,
    'currentForwardPrice',
  );
  const deliveryPrice = nonNegativeNumber(input.deliveryPrice, 'deliveryPrice');
  const discountFactor = positiveNumber(
    input.discountFactorToDelivery,
    'discountFactorToDelivery',
  );
  const quantity = positiveNumber(input.quantity ?? 1, 'quantity');

  return finiteNumber(
    quantity * discountFactor * (currentForwardPrice - deliveryPrice),
    'long forward contract value',
  );
}

/** Value to the short, exactly opposite to the long under the same contract. */
export function shortForwardContractValue(
  input: ForwardContractValueInput,
): number {
  return finiteNumber(
    -longForwardContractValue(input),
    'short forward contract value',
  );
}
