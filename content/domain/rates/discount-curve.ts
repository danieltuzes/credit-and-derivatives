import { finiteNumber, positiveNumber } from '../scalars';

export interface DiscountFactorPoint {
  /** Exact model-year time measured from valuation time. */
  readonly timeYears: number;
  /** Valuation-time currency per one unit of currency paid at timeYears. */
  readonly discountFactor: number;
}

export interface LogLinearDiscountCurve {
  readonly points: readonly Readonly<DiscountFactorPoint>[];
  readonly discountFactorAt: (timeYears: number) => number;
}

/**
 * Creates a deterministic discount curve with D(0, 0) = 1 and linear
 * interpolation of log discount factors. Extrapolation is intentionally absent.
 */
export function createLogLinearDiscountCurve(
  inputPoints: readonly DiscountFactorPoint[],
): LogLinearDiscountCurve {
  if (inputPoints.length === 0) {
    throw new RangeError('discount curve must contain at least one point');
  }

  const points: DiscountFactorPoint[] = [{ timeYears: 0, discountFactor: 1 }];
  let previousTime = 0;
  for (const [index, inputPoint] of inputPoints.entries()) {
    const timeYears = positiveNumber(
      inputPoint.timeYears,
      `points[${index}].timeYears`,
    );
    const discountFactor = positiveNumber(
      inputPoint.discountFactor,
      `points[${index}].discountFactor`,
    );
    if (timeYears <= previousTime) {
      throw new RangeError('discount curve times must be strictly increasing');
    }
    points.push({ timeYears, discountFactor });
    previousTime = timeYears;
  }

  const frozenPoints = points.map((point) => Object.freeze({ ...point }));

  function discountFactorAt(timeYearsInput: number): number {
    const timeYears = finiteNumber(timeYearsInput, 'timeYears');
    if (timeYears < 0 || timeYears > frozenPoints.at(-1)!.timeYears) {
      throw new RangeError('timeYears must lie within the discount curve');
    }
    if (timeYears === 0) return 1;

    const rightIndex = frozenPoints.findIndex(
      (point) => point.timeYears >= timeYears,
    );
    const right = frozenPoints[rightIndex];
    if (right.timeYears === timeYears) return right.discountFactor;

    const left = frozenPoints[rightIndex - 1];
    const weight =
      (timeYears - left.timeYears) / (right.timeYears - left.timeYears);
    return finiteNumber(
      Math.exp(
        Math.log(left.discountFactor) +
          weight *
            (Math.log(right.discountFactor) - Math.log(left.discountFactor)),
      ),
      'interpolated discount factor',
    );
  }

  return {
    points: Object.freeze(frozenPoints.slice(1)),
    discountFactorAt,
  };
}

/** Time-start currency per one unit of time-end currency. */
export function forwardDiscountFactor(
  curve: LogLinearDiscountCurve,
  startTimeYears: number,
  endTimeYears: number,
): number {
  const start = finiteNumber(startTimeYears, 'startTimeYears');
  const end = finiteNumber(endTimeYears, 'endTimeYears');
  if (start < 0 || end <= start) {
    throw new RangeError(
      'startTimeYears must be non-negative and precede endTimeYears',
    );
  }
  return positiveNumber(
    curve.discountFactorAt(end) / curve.discountFactorAt(start),
    'forward discount factor',
  );
}

/** Continuously compounded annual zero rate in decimal units per model-year. */
export function continuousZeroRate(
  curve: LogLinearDiscountCurve,
  timeYears: number,
): number {
  const time = positiveNumber(timeYears, 'timeYears');
  return finiteNumber(
    -Math.log(curve.discountFactorAt(time)) / time,
    'continuous zero rate',
  );
}

/** Continuously compounded annual forward rate in decimal units per model-year. */
export function continuousForwardRate(
  curve: LogLinearDiscountCurve,
  startTimeYears: number,
  endTimeYears: number,
): number {
  const discountFactor = forwardDiscountFactor(
    curve,
    startTimeYears,
    endTimeYears,
  );
  return finiteNumber(
    -Math.log(discountFactor) / (endTimeYears - startTimeYears),
    'continuous forward rate',
  );
}
