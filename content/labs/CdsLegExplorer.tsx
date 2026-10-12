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
import { valueSimplifiedFlatHazardCds } from '../domain/cds/flat-hazard-cds';
import { chartBox } from './chart-box';
import { createLabState } from './lab-state';

const CHART_WIDTH = 680;
const CHART_HEIGHT = 300;

const NOTIONAL = 10_000_000;
const PAYMENT_FREQUENCY = 4;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const wholeAmount = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const basisPoints = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

interface CdsInputs {
  readonly contractSpreadBasisPoints: number;
  readonly hazardPercent: number;
  readonly recoveryPercent: number;
  readonly discountRatePercent: number;
  /** Whole model-years to maturity. */
  readonly termYears: number;
}

/** The contract shown until a reader moves a control; the export draws it too. */
export const CDS_DEFAULTS: CdsInputs = {
  contractSpreadBasisPoints: 120,
  hazardPercent: 2.5,
  recoveryPercent: 40,
  discountRatePercent: 4,
  termYears: 5,
};

/** The plot (the figure's picture) and the tools after its caption share these. */
const useCdsInputs = createLabState(CDS_DEFAULTS);

/** The tested domain valuation of the contract the inputs describe. */
export function cdsValue(inputs: CdsInputs) {
  return valueSimplifiedFlatHazardCds({
    termYears: inputs.termYears,
    paymentFrequency: PAYMENT_FREQUENCY,
    notional: NOTIONAL,
    fixedCouponAnnualRate: inputs.contractSpreadBasisPoints / 10_000,
    recoveryRate: inputs.recoveryPercent / 100,
    continuouslyCompoundedRiskFreeRatePerYear: inputs.discountRatePercent / 100,
    constantRiskNeutralHazardRatePerYear: inputs.hazardPercent / 100,
  });
}

/** One bar per leg, each the leg's present value as a positive magnitude. */
export function cdsLegPlotOptions(
  premiumLegPresentValue: number,
  protectionLegPresentValue: number,
): Plot.PlotOptions {
  const data = [
    { leg: 'Premium', presentValue: premiumLegPresentValue },
    { leg: 'Protection', presentValue: protectionLegPresentValue },
  ];
  return {
    ariaLabel:
      'CDS premium-leg and protection-leg present-value magnitudes in US dollars.',
    ariaDescription:
      'The same values and their protection-buyer difference appear in text below the caption, before the period table.',
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    marginLeft: 78,
    x: { label: null },
    y: { label: 'Present-value magnitude (USD)', grid: true },
    marks: [
      Plot.barY(data, {
        x: 'leg',
        y: 'presentValue',
        fill: (row) => (row.leg === 'Premium' ? '#d2542d' : '#1a9876'),
        ariaHidden: 'true',
      }),
      Plot.ruleY([0], { ariaHidden: 'true' }),
    ],
  };
}

/**
 * The figure's picture: the two legs of the contract the tools set. It also
 * states that contract and both leg values at the end of the figure's
 * caption, which prints with the plot. `children` is the build's copy of the
 * plot at the defaults (`CdsLegPicture.astro`), shown until this one is
 * drawn.
 */
export function CdsLegPlot({ children }: { children?: ReactNode }) {
  const [inputs] = useCdsInputs();
  const chartRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const value = useMemo(() => cdsValue(inputs), [inputs]);
  const { premiumLegPresentValue, protectionLegPresentValue } = value;

  useEffect(() => {
    const host = chartRef.current;
    if (!host) return;
    // No-break spaces keep a currency code with its amount.
    setFigureState(host, [
      `Shown for a contractual spread of ${basisPoints.format(inputs.contractSpreadBasisPoints)} bp/year, a constant risk-neutral hazard rate of ${percent.format(inputs.hazardPercent)}%/year, a recovery rate of ${percent.format(inputs.recoveryPercent)}%, a continuously compounded risk-free rate of ${percent.format(inputs.discountRatePercent)}% and a maturity of ${inputs.termYears} ${inputs.termYears === 1 ? 'year' : 'years'}: premium leg USD\u00a0${wholeAmount.format(premiumLegPresentValue)}, protection leg USD\u00a0${wholeAmount.format(protectionLegPresentValue)}.`,
    ]);
  }, [inputs, premiumLegPresentValue, protectionLegPresentValue]);

  useEffect(() => {
    const host = chartRef.current;
    if (!host) return;
    const chart = Plot.plot(
      cdsLegPlotOptions(premiumLegPresentValue, protectionLegPresentValue),
    );
    host.replaceChildren(chart);
    setDrawn(true);
    return () => chart.remove();
  }, [premiumLegPresentValue, protectionLegPresentValue]);

  return (
    <div className="lab-shell not-content">
      <div
        className="lab-chart cds-leg-chart"
        style={chartBox(CHART_WIDTH, CHART_HEIGHT)}
      >
        {drawn ? null : children}
        <div className="lab-chart-live" ref={chartRef} />
      </div>
    </div>
  );
}

interface RangeFieldProps {
  readonly label: string;
  readonly exactLabel: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly disabled: boolean;
  readonly format: (value: number) => string;
  readonly onChange: (value: number) => void;
}

function RangeField({
  label,
  exactLabel,
  min,
  max,
  step,
  value,
  disabled,
  format,
  onChange,
}: RangeFieldProps) {
  const rangeId = useId();
  const numberId = useId();

  const update = (next: number) => {
    if (!Number.isFinite(next)) return;
    onChange(Math.min(max, Math.max(min, next)));
  };

  const restoreBlank = (input: HTMLInputElement) => {
    if (!Number.isFinite(input.valueAsNumber)) input.value = String(value);
  };

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
        disabled={disabled}
        onChange={(event) => update(event.currentTarget.valueAsNumber)}
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
        disabled={disabled}
        onChange={(event) => update(event.currentTarget.valueAsNumber)}
        onBlur={(event) => restoreBlank(event.currentTarget)}
      />
    </div>
  );
}

function modelInterpretation(
  protectionBuyerPresentValue: number,
  protectionLegPresentValue: number,
): string {
  const tolerance = Math.max(1, protectionLegPresentValue * 0.00005);
  if (Math.abs(protectionBuyerPresentValue) <= tolerance) {
    return 'At this contractual spread, the two leg magnitudes are approximately balanced.';
  }
  return protectionBuyerPresentValue > 0
    ? 'At this contractual spread, protection exceeds premium, so the model value is positive to the protection buyer.'
    : 'At this contractual spread, premium exceeds protection, so the model value is negative to the protection buyer.';
}

/**
 * The figure's tools, after its caption: what to do, the model's fixed
 * terms, the five controls, the live leg values and par spread, the model's
 * assumptions, and the period-by-period table.
 */
export function CdsLegTools() {
  const [interactive, setInteractive] = useState(false);
  const [inputs, setInputs] = useCdsInputs();
  const {
    contractSpreadBasisPoints,
    hazardPercent,
    recoveryPercent,
    discountRatePercent,
    termYears,
  } = inputs;

  useEffect(() => setInteractive(true), []);

  const value = useMemo(() => cdsValue(inputs), [inputs]);

  const interpretation = modelInterpretation(
    value.protectionBuyerPresentValueBeforeUpfront,
    value.protectionLegPresentValue,
  );

  return (
    <div className="lab-shell lab-tools">
      <p className="lab-instruction">
        Change the contractual spread, the constant risk-neutral hazard rate,
        the recovery rate, the risk-free rate, or the maturity. The table at the
        end shows the contribution of every period.
      </p>
      <p>
        The notional is fixed at {money.format(NOTIONAL)} and the synthetic
        schedule has four equal model periods per year. Default-triggered cash
        flows are integrated at their exact modeled default times. Rates entered
        as percentages or basis points are converted to decimals at this UI
        boundary.
      </p>
      {!interactive && (
        <p className="lab-model-note">
          Interactive controls require JavaScript. The chart shows the legs of
          the default contract. The default result, assumptions, and complete
          period table remain available below.
        </p>
      )}

      <div className="lab-controls">
        <RangeField
          label="Contractual spread"
          exactLabel="Exact contractual spread in basis points per year"
          min={0}
          max={1_000}
          step={5}
          value={contractSpreadBasisPoints}
          disabled={!interactive}
          format={(number) => `${basisPoints.format(number)} bp/year`}
          onChange={(number) =>
            setInputs({ contractSpreadBasisPoints: number })
          }
        />
        <RangeField
          label="Constant risk-neutral hazard"
          exactLabel="Exact constant risk-neutral hazard rate in percent per model-year"
          min={0}
          max={20}
          step={0.25}
          value={hazardPercent}
          disabled={!interactive}
          format={(number) => `${percent.format(number)}%/year`}
          onChange={(number) => setInputs({ hazardPercent: number })}
        />
        <RangeField
          label="Recovery rate"
          exactLabel="Exact recovery rate in percent of notional"
          min={0}
          max={100}
          step={1}
          value={recoveryPercent}
          disabled={!interactive}
          format={(number) => `${percent.format(number)}%`}
          onChange={(number) => setInputs({ recoveryPercent: number })}
        />
        <RangeField
          label="Continuously compounded risk-free rate"
          exactLabel="Exact continuously compounded risk-free rate in percent per model-year"
          min={0}
          max={15}
          step={0.25}
          value={discountRatePercent}
          disabled={!interactive}
          format={(number) => `${percent.format(number)}%`}
          onChange={(number) => setInputs({ discountRatePercent: number })}
        />
        <RangeField
          label="Maturity"
          exactLabel="Exact maturity in whole model-years"
          min={1}
          max={10}
          step={1}
          value={termYears}
          disabled={!interactive}
          format={(number) => `${number} ${number === 1 ? 'year' : 'years'}`}
          onChange={(number) => setInputs({ termYears: Math.round(number) })}
        />
      </div>

      <div className="lab-result" aria-live="polite">
        <dl className="lab-metric-grid">
          <div>
            <dt>Scheduled premium PV</dt>
            <dd data-cds-output="scheduled-premium">
              {money.format(value.scheduledPremiumPresentValue)}
            </dd>
          </div>
          <div>
            <dt>Accrued-on-default premium PV</dt>
            <dd data-cds-output="accrued-premium">
              {money.format(value.accruedOnDefaultPresentValue)}
            </dd>
          </div>
          <div>
            <dt>Premium-leg magnitude</dt>
            <dd data-cds-output="premium-leg">
              {money.format(value.premiumLegPresentValue)}
            </dd>
          </div>
          <div>
            <dt>Protection-leg magnitude</dt>
            <dd data-cds-output="protection-leg">
              {money.format(value.protectionLegPresentValue)}
            </dd>
          </div>
          <div>
            <dt>Protection-buyer net PV before upfront</dt>
            <dd data-cds-output="buyer-net">
              {money.format(value.protectionBuyerPresentValueBeforeUpfront)}
            </dd>
          </div>
          <div>
            <dt>Par spread</dt>
            <dd data-cds-output="par-spread">
              {basisPoints.format(value.parSpreadAnnualRate * 10_000)} bp/year
            </dd>
          </div>
        </dl>
        <p data-cds-output="interpretation">{interpretation}</p>
      </div>

      <div className="lab-model-note">
        <h3>Model assumptions beside this output</h3>
        <ul>
          <li>
            Exact equal quarterly model periods; no dates, day count, stubs, or
            business-day adjustments.
          </li>
          <li>
            Supplied constant risk-neutral hazard and a deterministic
            continuously compounded risk-free rate; no curve calibration.
          </li>
          <li>
            Protection and accrued premium are integrated over every possible
            default time and discounted from that modeled time.
          </li>
          <li>
            Accrued premium uses elapsed model time since the preceding premium
            date; it is not a half-period approximation.
          </li>
          <li>
            Deterministic recovery, one modeled default, running spread only,
            and no quote calibration, counterparty risk, funding, or actual
            settlement mechanics.
          </li>
        </ul>
      </div>

      <h3>Period-by-period factor table</h3>
      <p>
        The annuity columns are per unit notional and per unit annual spread.
        The protection factor already includes loss given default. Summing each
        contribution column reproduces the corresponding tested domain total.
      </p>
      <div
        className="lab-table-scroll"
        role="region"
        aria-label="CDS period-by-period valuation factor table"
        tabIndex={0}
      >
        <table className="lab-data-table">
          <caption>
            Current exact-time quarterly schedule, survival values, discount
            factors, and leg-factor contributions
          </caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Start–end, years</th>
              <th scope="col">Start survival</th>
              <th scope="col">End survival</th>
              <th scope="col">Interval default</th>
              <th scope="col">Payment discount factor</th>
              <th scope="col">Scheduled annuity</th>
              <th scope="col">Accrued annuity</th>
              <th scope="col">Protection factor</th>
            </tr>
          </thead>
          <tbody>
            {value.periodContributions.map((row) => (
              <tr key={row.endTimeYears}>
                <th scope="row">{row.periodNumber}</th>
                <td>
                  {row.startTimeYears.toFixed(2)}–{row.endTimeYears.toFixed(2)}
                </td>
                <td>{row.survivalProbabilityAtPeriodStart.toFixed(6)}</td>
                <td>{row.survivalProbabilityAtPeriodEnd.toFixed(6)}</td>
                <td>{row.intervalRiskNeutralDefaultProbability.toFixed(6)}</td>
                <td>{row.discountFactorAtPayment.toFixed(6)}</td>
                <td>
                  {row.scheduledPremiumAnnuityContributionYears.toFixed(6)}
                </td>
                <td>
                  {row.accruedOnDefaultAnnuityContributionYears.toFixed(6)}
                </td>
                <td>{row.protectionLegFactorContribution.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={6}>
                Totals
              </th>
              <td>{value.scheduledPremiumAnnuityYears.toFixed(6)}</td>
              <td>{value.accruedOnDefaultAnnuityYears.toFixed(6)}</td>
              <td>{value.protectionLegFactor.toFixed(6)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
