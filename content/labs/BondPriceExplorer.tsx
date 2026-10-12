import * as Plot from '@observablehq/plot';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setFigureState } from 'explico/components/figure/figure-state.ts';
import {
  createFixedCouponBond,
  priceFixedCouponBond,
} from '../domain/bonds/fixed-coupon-bond';
import { chartBox } from './chart-box';
import { createLabState } from './lab-state';

const CHART_WIDTH = 680;
const CHART_HEIGHT = 320;

const priceFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

interface BondInputs {
  readonly couponPercent: number;
  readonly yieldPercent: number;
  /** Whole years to maturity. */
  readonly years: number;
  readonly frequency: 1 | 2 | 4;
}

/** The bond shown until a reader changes a control; the export draws it too. */
export const BOND_DEFAULTS: BondInputs = {
  couponPercent: 5,
  yieldPercent: 6,
  years: 5,
  frequency: 2,
};

/** The plot (the figure's picture) and the tools after its caption share these. */
const useBondInputs = createLabState(BOND_DEFAULTS);

/** The price at the chosen yield, and the price-yield curve from 0% to 15%. */
function bondPrices({
  couponPercent,
  yieldPercent,
  years,
  frequency,
}: BondInputs) {
  const bond = createFixedCouponBond({
    faceValue: 100,
    annualCouponRate: couponPercent / 100,
    termYears: years,
    paymentFrequency: frequency,
  });

  const curve = Array.from({ length: 61 }, (_, index) => {
    const curveYieldPercent = index * 0.25;
    return {
      yieldPercent: curveYieldPercent,
      price: priceFixedCouponBond(bond, curveYieldPercent / 100),
    };
  });

  return {
    price: priceFixedCouponBond(bond, yieldPercent / 100),
    curve,
  };
}

/**
 * The plot for one bond: its price at every yield from 0% to 15%, with a dot
 * at the chosen yield and a dashed line at par.
 */
export function bondPricePlotOptions(inputs: BondInputs): Plot.PlotOptions {
  const { price, curve } = bondPrices(inputs);
  return {
    ariaLabel:
      'Bond price by yield. The curve slopes downward as yield increases.',
    ariaDescription:
      'The controls update the selected yield, price, and the tabular text alternative below.',
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    marginLeft: 58,
    x: { label: 'Yield to maturity (%)', grid: true },
    y: { label: 'Price per 100 face value', grid: true },
    marks: [
      Plot.line(curve, {
        x: 'yieldPercent',
        y: 'price',
        stroke: '#1a9876',
        strokeWidth: 3,
        ariaHidden: 'true',
      }),
      Plot.dot([{ yieldPercent: inputs.yieldPercent, price }], {
        x: 'yieldPercent',
        y: 'price',
        fill: '#d2542d',
        r: 5,
        ariaHidden: 'true',
      }),
      Plot.ruleY([100], {
        strokeDasharray: '4,4',
        ariaHidden: 'true',
      }),
    ],
  };
}

const PAYMENTS_A_YEAR = {
  1: '1 coupon payment',
  2: '2 coupon payments',
  4: '4 coupon payments',
} as const;

/**
 * The figure's picture: the price-yield curve of the bond the tools set. It
 * also states that bond and its price at the end of the figure's caption,
 * which prints with the plot. `children` is the build's copy of the plot at
 * the defaults (`BondPricePicture.astro`), shown until this one is drawn.
 */
export function BondPricePlot({ children }: { children?: ReactNode }) {
  const [inputs] = useBondInputs();
  const chartRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const options = useMemo(() => bondPricePlotOptions(inputs), [inputs]);
  const { price } = useMemo(() => bondPrices(inputs), [inputs]);

  useEffect(() => {
    const host = chartRef.current;
    if (!host) return;
    setFigureState(host, [
      `Shown for a ${percent.format(inputs.couponPercent)}% annual coupon rate, ${PAYMENTS_A_YEAR[inputs.frequency]} a year and a ${inputs.years}-year maturity: at a ${percent.format(inputs.yieldPercent)}% yield to maturity, the price is ${priceFormat.format(price)} per 100 face value.`,
    ]);
  }, [inputs, price]);

  useEffect(() => {
    const host = chartRef.current;
    if (!host) return;
    const chart = Plot.plot(options);
    host.replaceChildren(chart);
    setDrawn(true);
    return () => chart.remove();
  }, [options]);

  return (
    <div className="lab-shell not-content">
      <div className="lab-chart" style={chartBox(CHART_WIDTH, CHART_HEIGHT)}>
        {drawn ? null : children}
        <div className="lab-chart-live" ref={chartRef} />
      </div>
    </div>
  );
}

/**
 * The figure's tools, after its caption: what to do, the four controls, the
 * live price, and the model's assumptions with a table of points from the
 * curve.
 */
export function BondPriceTools() {
  const couponId = useId();
  const yieldRangeId = useId();
  const yieldNumberId = useId();
  const yearsId = useId();
  const frequencyId = useId();
  const [inputs, setInputs] = useBondInputs();
  const { couponPercent, yieldPercent, years, frequency } = inputs;

  const result = useMemo(() => bondPrices(inputs), [inputs]);

  const setBoundedCoupon = (value: number) => {
    if (!Number.isFinite(value)) return;
    setInputs({ couponPercent: Math.min(20, Math.max(0, value)) });
  };
  const setBoundedYield = (value: number) => {
    if (!Number.isFinite(value)) return;
    setInputs({ yieldPercent: Math.min(15, Math.max(0, value)) });
  };
  const setBoundedYears = (value: number) => {
    if (!Number.isFinite(value)) return;
    setInputs({ years: Math.round(Math.min(30, Math.max(1, value))) });
  };

  return (
    <div className="lab-shell lab-tools">
      <p className="lab-instruction">
        Change the coupon rate, the yield, the maturity, or the number of coupon
        payments a year. The curve, the dot, and the price follow.
      </p>
      <div className="lab-controls">
        <label className="lab-control" htmlFor={couponId}>
          Annual coupon rate (%)
          <input
            id={couponId}
            type="number"
            min="0"
            max="20"
            step="0.25"
            value={couponPercent}
            onChange={(event) =>
              setBoundedCoupon(event.currentTarget.valueAsNumber)
            }
          />
        </label>
        <div className="lab-control">
          <label htmlFor={yieldRangeId}>Yield to maturity (%)</label>
          <input
            id={yieldRangeId}
            type="range"
            min="0"
            max="15"
            step="0.1"
            value={yieldPercent}
            onChange={(event) =>
              setBoundedYield(event.currentTarget.valueAsNumber)
            }
          />
          <label className="sr-only" htmlFor={yieldNumberId}>
            Exact yield to maturity (%)
          </label>
          <input
            id={yieldNumberId}
            aria-label="Exact yield to maturity in percent"
            type="number"
            min="0"
            max="15"
            step="0.1"
            value={yieldPercent}
            onChange={(event) =>
              setBoundedYield(event.currentTarget.valueAsNumber)
            }
          />
        </div>
        <label className="lab-control" htmlFor={yearsId}>
          Maturity (years)
          <input
            id={yearsId}
            type="number"
            min="1"
            max="30"
            step="1"
            value={years}
            onChange={(event) =>
              setBoundedYears(event.currentTarget.valueAsNumber)
            }
          />
        </label>
        <label className="lab-control" htmlFor={frequencyId}>
          Coupon payments per year
          <select
            id={frequencyId}
            value={frequency}
            onChange={(event) =>
              setInputs({
                frequency: Number(event.currentTarget.value) as 1 | 2 | 4,
              })
            }
          >
            <option value="1">1 — annual</option>
            <option value="2">2 — semiannual</option>
            <option value="4">4 — quarterly</option>
          </select>
        </label>
      </div>

      <div className="lab-result" aria-live="polite">
        <strong>Price: {priceFormat.format(result.price)}</strong> per 100 face
        value
      </div>

      <p>
        For positive fixed cash flows, moving right to a higher yield lowers
        every discount factor and therefore lowers the price.
      </p>
      <details>
        <summary>View assumptions and a text alternative</summary>
        <p>
          Settlement is on a coupon date. The model uses a flat nominal yield
          compounded at the coupon frequency, redemption at par, and no accrued
          interest, default, liquidity effect, tax, or embedded option.
        </p>
        <table className="lab-data-table">
          <caption>Selected points from the current price–yield curve</caption>
          <thead>
            <tr>
              <th scope="col">Yield</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            {[0, 3, 6, 9, 12, 15].map((selectedYield) => {
              const point = result.curve.find(
                ({ yieldPercent: value }) => value === selectedYield,
              );
              return (
                <tr key={selectedYield}>
                  <td>{selectedYield.toFixed(1)}%</td>
                  <td>{priceFormat.format(point?.price ?? Number.NaN)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}
