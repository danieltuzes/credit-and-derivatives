import * as Plot from '@observablehq/plot';
import {
  forwardRef,
  memo,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RenderedLabMath } from '../../notation/render-lab-math';
import { periodicDiscountFactor } from '../../domain/present-value';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const wholeMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Plain grouped decimal for a `[data-lab-slot]` text node (not LaTeX). */
function fixed(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

// Math templates for this lab. Real notation symbols (D(0,t), y, t, PV_0, C)
// are resolved against the page's notation scope at build time by
// DiscountingExplorerMath.astro; `\slot{name}{fallback}` marks a numeric hole
// this component fills at runtime. The build fails if any symbol here is not a
// defined notation entry on the lesson.
export const DISCOUNTING_LAB_MATH = {
  discountFactor: String.raw`D(0,t) = (1 + y)^{-t} = (1 + \slot{rate}{0.0500})^{-\slot{years}{2}} \;=\; \slot{factor}{0.907029}`,
  presentValue: String.raw`PV_0 = C \cdot D(0,t) = \slot{payment}{1{,}000.00} \times \slot{factor}{0.907029} \;=\; \slot{present}{907.03}`,
} as const;

type TemplateId = keyof typeof DISCOUNTING_LAB_MATH;

interface LabMathHandle {
  setSlots(values: Readonly<Record<string, string>>): void;
}

// Rendered once from server markup and never reconciled again (memoised on the
// stable HTML), so the notation markers the page's notation layer wires at load
// survive every slider change. Slot text is updated imperatively.
const LabMath = memo(
  forwardRef<LabMathHandle, { rendered: RenderedLabMath }>(function LabMath(
    { rendered },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        setSlots(values) {
          const root = rootRef.current;
          if (!root) return;
          for (const [name, value] of Object.entries(values)) {
            const cell = root.querySelector<HTMLElement>(
              `[data-lab-slot="${name}"]`,
            );
            if (cell && cell.textContent !== value) cell.textContent = value;
          }
        },
      }),
      [],
    );

    return (
      <div
        ref={rootRef}
        className="lab-math"
        // Server KaTeX markup is authoritative; only its serialization differs
        // from a client render, and this subtree is never re-rendered.
        suppressHydrationWarning
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    );
  }),
  (a, b) => a.rendered.html === b.rendered.html,
);

interface RangeFieldProps {
  label: string;
  exactLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

function RangeField({
  label,
  exactLabel,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: RangeFieldProps) {
  const rangeId = useId();
  const numberId = useId();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="lab-control">
      <label htmlFor={rangeId}>
        {label} <span className="lab-field-value">{format(value)}</span>
      </label>
      <input
        id={rangeId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.currentTarget.value)))}
      />
      <label className="sr-only" htmlFor={numberId}>
        {exactLabel}
      </label>
      <input
        id={numberId}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.currentTarget.value)))}
      />
    </div>
  );
}

const CHART_TIMES = [0, 5, 10, 15, 20, 25, 30];

export default function DiscountingExplorer({
  math,
}: {
  math: Record<TemplateId, RenderedLabMath>;
}) {
  const [amount, setAmount] = useState(1_000);
  const [annualRatePercent, setAnnualRatePercent] = useState(5);
  const [years, setYears] = useState(2);
  const chartRef = useRef<HTMLDivElement>(null);
  const mathRefs = useRef<Partial<Record<TemplateId, LabMathHandle | null>>>(
    {},
  );

  const rate = annualRatePercent / 100;
  const factorAt = useMemo(() => periodicDiscountFactor(rate, 1), [rate]);
  const factor = factorAt(years);
  const presentValue = amount * factor;

  useEffect(() => {
    mathRefs.current.discountFactor?.setSlots({
      rate: fixed(rate, 4),
      years: String(years),
      factor: fixed(factor, 6),
    });
    mathRefs.current.presentValue?.setSlots({
      payment: fixed(amount, 2),
      factor: fixed(factor, 6),
      present: fixed(presentValue, 2),
    });
  });

  const curve = useMemo(
    () =>
      Array.from({ length: 61 }, (_, index) => {
        const timeYears = index * 0.5;
        return { timeYears, value: amount * factorAt(timeYears) };
      }),
    [amount, factorAt],
  );

  useEffect(() => {
    const host = chartRef.current;
    if (!host) return;

    const chart = Plot.plot({
      ariaLabel:
        'Value today by time to payment. The curve falls as the wait grows.',
      ariaDescription:
        'Moving the sliders updates the marked point and the table below.',
      width: 680,
      height: 300,
      marginLeft: 68,
      marginTop: 24,
      x: { label: 'Time to payment (years)', grid: true },
      y: { label: 'Value today (USD)', grid: true, zero: true },
      marks: [
        Plot.ruleY([amount], {
          strokeDasharray: '4,4',
          ariaHidden: 'true',
        }),
        Plot.line(curve, {
          x: 'timeYears',
          y: 'value',
          stroke: '#1a9876',
          strokeWidth: 3,
          ariaHidden: 'true',
        }),
        Plot.ruleX([years], {
          stroke: '#d2542d',
          strokeOpacity: 0.35,
          ariaHidden: 'true',
        }),
        Plot.dot([{ timeYears: years, value: presentValue }], {
          x: 'timeYears',
          y: 'value',
          fill: '#d2542d',
          stroke: 'var(--sl-color-bg)',
          strokeWidth: 2,
          r: 6,
          ariaHidden: 'true',
        }),
      ],
    });

    host.replaceChildren(chart);
    return () => chart.remove();
  }, [curve, years, presentValue, amount]);

  return (
    <section className="lab-shell" aria-labelledby="discounting-lab-title">
      <h3 id="discounting-lab-title">Try discounting a future payment</h3>
      <div className="lab-controls">
        <RangeField
          label="Future payment"
          exactLabel="Exact future payment in US dollars"
          min={0}
          max={25_000}
          step={100}
          value={amount}
          format={(value) => wholeMoney.format(value)}
          onChange={setAmount}
        />
        <RangeField
          label="Annual rate"
          exactLabel="Exact annual rate in percent"
          min={0}
          max={25}
          step={0.25}
          value={annualRatePercent}
          format={(value) => `${percent.format(value)}%`}
          onChange={setAnnualRatePercent}
        />
        <RangeField
          label="Time to payment"
          exactLabel="Exact time to payment in whole years"
          min={1}
          max={30}
          step={1}
          value={years}
          format={(value) => `${value} ${value === 1 ? 'year' : 'years'}`}
          onChange={setYears}
        />
      </div>

      <div className="lab-result" aria-live="polite">
        <strong>Present value: {money.format(presentValue)}</strong>
        <br />
        Discount factor: {factor.toFixed(6)}
      </div>

      <LabMath
        rendered={math.discountFactor}
        ref={(handle) => {
          mathRefs.current.discountFactor = handle;
        }}
      />
      <LabMath
        rendered={math.presentValue}
        ref={(handle) => {
          mathRefs.current.presentValue = handle;
        }}
      />

      <figure className="lab-chart-figure">
        <div className="lab-chart" ref={chartRef} />
        <figcaption>
          Value today across the whole 0–30 year range at the current rate. The
          dot is your selected payment; the dashed line is its undiscounted
          amount.
        </figcaption>
      </figure>

      <p>
        The future payment is unchanged. Increasing the rate or waiting longer
        lowers its value today because the discount factor becomes smaller.
      </p>
      <details>
        <summary>Assumptions and a text alternative</summary>
        <p>
          This toy model uses a deterministic payment, a whole number of years,
          and annual compounding. It has no curve, calendar, uncertainty,
          credit, tax, or funding.
        </p>
        <table className="lab-data-table">
          <caption>
            Value today at the current rate ({percent.format(annualRatePercent)}
            %)
          </caption>
          <thead>
            <tr>
              <th scope="col">Time to payment</th>
              <th scope="col">Value today</th>
            </tr>
          </thead>
          <tbody>
            {CHART_TIMES.map((time) => (
              <tr key={time}>
                <td>
                  {time} {time === 1 ? 'year' : 'years'}
                </td>
                <td>{money.format(amount * factorAt(time))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
