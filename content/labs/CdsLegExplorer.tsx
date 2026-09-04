import * as Plot from '@observablehq/plot';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { valueSimplifiedFlatHazardCds } from '../domain/cds/flat-hazard-cds';

const NOTIONAL = 10_000_000;
const PAYMENT_FREQUENCY = 4;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const basisPoints = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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

export default function CdsLegExplorer() {
  const titleId = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);
  const [contractSpreadBasisPoints, setContractSpreadBasisPoints] =
    useState(120);
  const [hazardPercent, setHazardPercent] = useState(2.5);
  const [recoveryPercent, setRecoveryPercent] = useState(40);
  const [discountRatePercent, setDiscountRatePercent] = useState(4);
  const [termYears, setTermYears] = useState(5);

  useEffect(() => setInteractive(true), []);

  const value = useMemo(() => {
    return valueSimplifiedFlatHazardCds({
      termYears,
      paymentFrequency: PAYMENT_FREQUENCY,
      notional: NOTIONAL,
      fixedCouponAnnualRate: contractSpreadBasisPoints / 10_000,
      recoveryRate: recoveryPercent / 100,
      continuouslyCompoundedRiskFreeRatePerYear: discountRatePercent / 100,
      constantRiskNeutralHazardRatePerYear: hazardPercent / 100,
    });
  }, [
    contractSpreadBasisPoints,
    discountRatePercent,
    hazardPercent,
    recoveryPercent,
    termYears,
  ]);

  useEffect(() => {
    const host = chartRef.current;
    if (!host) return;

    const data = [
      { leg: 'Premium', presentValue: value.premiumLegPresentValue },
      { leg: 'Protection', presentValue: value.protectionLegPresentValue },
    ];
    const chart = Plot.plot({
      ariaLabel:
        'CDS premium-leg and protection-leg present-value magnitudes in US dollars.',
      ariaDescription:
        'The same values and their protection-buyer difference appear in text immediately above and in the period table below.',
      width: 680,
      height: 300,
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
    });

    host.replaceChildren(chart);
    return () => chart.remove();
  }, [value.premiumLegPresentValue, value.protectionLegPresentValue]);

  const interpretation = modelInterpretation(
    value.protectionBuyerPresentValueBeforeUpfront,
    value.protectionLegPresentValue,
  );

  return (
    <section className="lab-shell" aria-labelledby={titleId}>
      <h3 id={titleId}>Explore the CDS premium and protection legs</h3>
      <p>
        The notional is fixed at {money.format(NOTIONAL)} and the synthetic
        schedule has four equal model periods per year. Default-triggered cash
        flows are integrated at their exact modeled default times. Rates entered
        as percentages or basis points are converted to decimals at this UI
        boundary.
      </p>
      {!interactive && (
        <p className="lab-model-note">
          Interactive controls and the chart require JavaScript. The default
          result, assumptions, and complete period table remain available below.
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
          onChange={setContractSpreadBasisPoints}
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
          onChange={setHazardPercent}
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
          onChange={setRecoveryPercent}
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
          onChange={setDiscountRatePercent}
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
          onChange={(number) => setTermYears(Math.round(number))}
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

      <figure className="lab-chart-figure">
        <div className="lab-chart cds-leg-chart" ref={chartRef} />
        <figcaption>
          Positive leg magnitudes at the selected contractual spread. The signed
          buyer value is protection minus premium, as reported above.
        </figcaption>
      </figure>

      <div className="lab-model-note">
        <h4>Model assumptions beside this output</h4>
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

      <h4>Period-by-period factor table</h4>
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
    </section>
  );
}
