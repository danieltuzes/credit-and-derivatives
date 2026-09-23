import { finiteNumber, positiveNumber } from '../scalars';
import {
  simplifiedFlatHazardQuoteToUpfront,
  simplifiedFlatHazardUpfrontToQuote,
  valueSimplifiedFlatHazardCds,
} from './flat-hazard-cds';

/** Which side of the protection a position or hedge takes. */
export type CdsProtectionSide = 'buy-protection' | 'sell-protection';

/**
 * How the liquid tenor's market level is quoted for the bump. The bump is
 * applied to the quoted number, and the flat hazard rate is re-solved from the
 * bumped quote before every contract is revalued.
 */
export type LiquidTenorQuoteKind = 'market-standard-quote' | 'upfront-fraction';

/**
 * The most liquid standard contract, which supplies the single market level of
 * the flat-hazard model. Its quote is a market-standard quote in annual decimal
 * form; the equivalent upfront fraction at its fixed coupon is derived.
 */
export interface LiquidTenorContract {
  readonly termYears: number;
  readonly paymentFrequency: number;
  readonly fixedCouponAnnualRate: number;
  readonly marketStandardQuoteAnnualRate: number;
}

/** A CDS position on the same reference entity, valued off the same flat hazard. */
export interface CdsPosition {
  readonly termYears: number;
  readonly fixedCouponAnnualRate: number;
  /** Positive notional in currency units. */
  readonly notional: number;
  readonly side: CdsProtectionSide;
}

export interface LiquidTenorEquivalentInput {
  readonly continuouslyCompoundedRiskFreeRatePerYear: number;
  readonly recoveryRate: number;
  readonly liquidTenor: LiquidTenorContract;
  readonly position: CdsPosition;
  /**
   * Quotation in which the liquid tenor is bumped. Defaults to the
   * market-standard quote.
   */
  readonly quoteKind?: LiquidTenorQuoteKind;
  /**
   * Size of the bump in the units of `quoteKind`: annual decimal rate for a
   * market-standard quote (0.0001 is one basis point) or fraction of notional
   * for an upfront (0.0001 is one basis point of notional). Defaults to 0.0001.
   */
  readonly bumpSize?: number;
}

export interface LiquidTenorEquivalentResult {
  readonly quoteKind: LiquidTenorQuoteKind;
  readonly bumpSize: number;
  /** Liquid-tenor market level before and after the bump, in quoteKind units. */
  readonly baseQuote: number;
  readonly bumpedQuote: number;
  /** Flat hazard rates re-solved from the base and bumped quotes. */
  readonly baseHazardRatePerYear: number;
  readonly bumpedHazardRatePerYear: number;
  /** Signed position value for its own side, before and after the bump. */
  readonly basePositionValue: number;
  readonly bumpedPositionValue: number;
  /** Change in signed position value for one bump of the liquid quote. */
  readonly positionSensitivity: number;
  /**
   * Change in the value of one unit of notional of the liquid contract, bought
   * as protection, for one bump of the liquid quote.
   */
  readonly liquidTenorSensitivityPerUnitNotionalBought: number;
  /** Positive notional of the liquid contract that offsets the position. */
  readonly equivalentNotional: number;
  /** Side of the liquid contract to trade for the offset. */
  readonly equivalentSide: CdsProtectionSide;
  /** Equivalent notional divided by position notional; a positive ratio. */
  readonly equivalentRatio: number;
  /**
   * Position sensitivity plus the hedge's sensitivity after trading the
   * equivalent notional; zero up to arithmetic.
   */
  readonly hedgedSensitivity: number;
}

/**
 * Sizes the liquid-tenor CDS that offsets a position's sensitivity to the
 * liquid tenor's market quote, under one flat-hazard model.
 *
 * The liquid quote is bumped by `bumpSize`, the flat hazard rate is re-solved
 * from the bumped quote, and both the position and one unit of the liquid
 * contract are revalued at the new hazard rate. The equivalent notional is
 * the ratio of the two value changes, with the side chosen so that the hedged
 * sensitivity is zero. Because both sensitivities pass through the same
 * hazard rate, the ratio does not depend on whether the liquid quote is
 * bumped as a market-standard quote or as an upfront fraction, up to the
 * curvature of the finite bump.
 */
export function liquidTenorEquivalent(
  input: LiquidTenorEquivalentInput,
): LiquidTenorEquivalentResult {
  const quoteKind = input.quoteKind ?? 'market-standard-quote';
  if (
    quoteKind !== 'market-standard-quote' &&
    quoteKind !== 'upfront-fraction'
  ) {
    throw new RangeError(
      'quoteKind must be "market-standard-quote" or "upfront-fraction"',
    );
  }
  const bumpSize = positiveNumber(input.bumpSize ?? 0.0001, 'bumpSize');
  const positionNotional = positiveNumber(
    input.position.notional,
    'position.notional',
  );
  if (
    input.position.side !== 'buy-protection' &&
    input.position.side !== 'sell-protection'
  ) {
    throw new RangeError(
      'position.side must be "buy-protection" or "sell-protection"',
    );
  }

  const liquidBase = {
    termYears: input.liquidTenor.termYears,
    paymentFrequency: input.liquidTenor.paymentFrequency,
    continuouslyCompoundedRiskFreeRatePerYear:
      input.continuouslyCompoundedRiskFreeRatePerYear,
    recoveryRate: input.recoveryRate,
    notional: 1,
    fixedCouponAnnualRate: input.liquidTenor.fixedCouponAnnualRate,
  } as const;

  const baseConverted = simplifiedFlatHazardQuoteToUpfront({
    ...liquidBase,
    marketStandardQuoteAnnualRate:
      input.liquidTenor.marketStandardQuoteAnnualRate,
  });
  const baseHazardRatePerYear =
    baseConverted.impliedRiskNeutralHazardRatePerYear;

  let baseQuote: number;
  let bumpedQuote: number;
  let bumpedHazardRatePerYear: number;
  if (quoteKind === 'market-standard-quote') {
    baseQuote = baseConverted.marketStandardQuoteAnnualRate;
    bumpedQuote = finiteNumber(baseQuote + bumpSize, 'bumped quote');
    bumpedHazardRatePerYear = simplifiedFlatHazardQuoteToUpfront({
      ...liquidBase,
      marketStandardQuoteAnnualRate: bumpedQuote,
    }).impliedRiskNeutralHazardRatePerYear;
  } else {
    baseQuote = baseConverted.fairUpfrontFractionPaidByProtectionBuyer;
    bumpedQuote = finiteNumber(baseQuote + bumpSize, 'bumped quote');
    bumpedHazardRatePerYear = simplifiedFlatHazardUpfrontToQuote({
      ...liquidBase,
      upfrontAmountPaidByProtectionBuyer: bumpedQuote,
    }).impliedRiskNeutralHazardRatePerYear;
  }

  const sideSign = input.position.side === 'buy-protection' ? 1 : -1;
  const positionValueAt = (hazardRatePerYear: number): number =>
    finiteNumber(
      sideSign *
        valueSimplifiedFlatHazardCds({
          termYears: input.position.termYears,
          paymentFrequency: input.liquidTenor.paymentFrequency,
          continuouslyCompoundedRiskFreeRatePerYear:
            input.continuouslyCompoundedRiskFreeRatePerYear,
          recoveryRate: input.recoveryRate,
          constantRiskNeutralHazardRatePerYear: hazardRatePerYear,
          notional: positionNotional,
          fixedCouponAnnualRate: input.position.fixedCouponAnnualRate,
        }).protectionBuyerPresentValueBeforeUpfront,
      'signed position value',
    );
  const liquidUnitValueBoughtAt = (hazardRatePerYear: number): number =>
    valueSimplifiedFlatHazardCds({
      ...liquidBase,
      constantRiskNeutralHazardRatePerYear: hazardRatePerYear,
    }).protectionBuyerPresentValueBeforeUpfront;

  const basePositionValue = positionValueAt(baseHazardRatePerYear);
  const bumpedPositionValue = positionValueAt(bumpedHazardRatePerYear);
  const positionSensitivity = finiteNumber(
    bumpedPositionValue - basePositionValue,
    'position sensitivity',
  );
  const liquidTenorSensitivityPerUnitNotionalBought = finiteNumber(
    liquidUnitValueBoughtAt(bumpedHazardRatePerYear) -
      liquidUnitValueBoughtAt(baseHazardRatePerYear),
    'liquid tenor sensitivity per unit notional',
  );
  if (liquidTenorSensitivityPerUnitNotionalBought <= 0) {
    throw new RangeError(
      'the liquid contract must gain value for its protection buyer when its quote rises; check the bump size and quote',
    );
  }

  // Bought liquid notional h satisfies positionSensitivity + h * unit = 0.
  const signedBoughtNotional = finiteNumber(
    -positionSensitivity / liquidTenorSensitivityPerUnitNotionalBought,
    'signed equivalent notional',
  );
  const equivalentSide: CdsProtectionSide =
    signedBoughtNotional >= 0 ? 'buy-protection' : 'sell-protection';
  const equivalentNotional = Math.abs(signedBoughtNotional);
  const equivalentRatio = finiteNumber(
    equivalentNotional / positionNotional,
    'equivalent ratio',
  );
  const hedgedSensitivity = finiteNumber(
    positionSensitivity +
      signedBoughtNotional * liquidTenorSensitivityPerUnitNotionalBought,
    'hedged sensitivity',
  );

  return {
    quoteKind,
    bumpSize,
    baseQuote,
    bumpedQuote,
    baseHazardRatePerYear,
    bumpedHazardRatePerYear,
    basePositionValue,
    bumpedPositionValue,
    positionSensitivity,
    liquidTenorSensitivityPerUnitNotionalBought,
    equivalentNotional,
    equivalentSide,
    equivalentRatio,
    hedgedSensitivity,
  };
}
