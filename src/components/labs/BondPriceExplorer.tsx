import * as Plot from '@observablehq/plot';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  createFixedCouponBond,
  priceFixedCouponBond,
} from '../../domain/bonds/fixed-coupon-bond';

const priceFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function BondPriceExplorer() {
  const couponId = useId();
  const yieldRangeId = useId();
  const yieldNumberId = useId();
  const yearsId = useId();
  const frequencyId = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  const [couponPercent, setCouponPercent] = useState(5);
  const [yieldPercent, setYieldPercent] = useState(6);
  const [years, setYears] = useState(5);
  const [frequency, setFrequency] = useState<1 | 2 | 4>(2);

  const result = useMemo(() => {
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
  }, [couponPercent, frequency, years, yieldPercent]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = Plot.plot({
      ariaLabel:
        'Bond price by yield. The curve slopes downward as yield increases.',
      ariaDescription:
        'The controls update the selected yield, price, and the tabular text alternative below.',
      width: 680,
      height: 320,
      marginLeft: 58,
      x: { label: 'Yield to maturity (%)', grid: true },
      y: { label: 'Price per 100 face value', grid: true },
      marks: [
        Plot.line(result.curve, {
          x: 'yieldPercent',
          y: 'price',
          stroke: '#1a9876',
          strokeWidth: 3,
          ariaHidden: 'true',
        }),
        Plot.dot([{ yieldPercent, price: result.price }], {
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
    });

    chartRef.current.replaceChildren(chart);
    return () => chart.remove();
  }, [result, yieldPercent]);

  const setBoundedCoupon = (value: number) => {
    if (!Number.isFinite(value)) return;
    setCouponPercent(Math.min(20, Math.max(0, value)));
  };
  const setBoundedYield = (value: number) => {
    if (!Number.isFinite(value)) return;
    setYieldPercent(Math.min(15, Math.max(0, value)));
  };
  const setBoundedYears = (value: number) => {
    if (!Number.isFinite(value)) return;
    setYears(Math.round(Math.min(30, Math.max(1, value))));
  };

  return (
    <section className="lab-shell" aria-labelledby="bond-lab-title">
      <h3 id="bond-lab-title">Explore the bond price–yield curve</h3>
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
              setFrequency(Number(event.currentTarget.value) as 1 | 2 | 4)
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

      <div className="lab-chart" ref={chartRef} />

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
    </section>
  );
}
