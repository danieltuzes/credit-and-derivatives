import { useId, useMemo, useState } from 'react';
import { periodicDiscountFactor } from '../../domain/present-value';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export default function DiscountingExplorer() {
  const amountId = useId();
  const rateId = useId();
  const yearsId = useId();
  const [amount, setAmount] = useState(1_000);
  const [annualRatePercent, setAnnualRatePercent] = useState(5);
  const [years, setYears] = useState(2);

  const result = useMemo(() => {
    const factor = periodicDiscountFactor(annualRatePercent / 100, 1)(years);
    return { factor, presentValue: amount * factor };
  }, [amount, annualRatePercent, years]);

  return (
    <section className="lab-shell" aria-labelledby="discounting-lab-title">
      <h3 id="discounting-lab-title">Try discounting a future payment</h3>
      <div className="lab-controls">
        <label className="lab-control" htmlFor={amountId}>
          Future payment (USD)
          <input
            id={amountId}
            type="number"
            min="1"
            step="100"
            value={amount}
            onChange={(event) => setAmount(Number(event.currentTarget.value))}
          />
        </label>
        <label className="lab-control" htmlFor={rateId}>
          Annual rate (%)
          <input
            id={rateId}
            type="number"
            min="0"
            max="25"
            step="0.25"
            value={annualRatePercent}
            onChange={(event) =>
              setAnnualRatePercent(Number(event.currentTarget.value))
            }
          />
        </label>
        <label className="lab-control" htmlFor={yearsId}>
          Time (years)
          <input
            id={yearsId}
            type="number"
            min="1"
            max="30"
            step="1"
            value={years}
            onChange={(event) => setYears(Number(event.currentTarget.value))}
          />
        </label>
      </div>

      <div className="lab-result" aria-live="polite">
        <strong>Present value: {money.format(result.presentValue)}</strong>
        <br />
        Discount factor: {result.factor.toFixed(6)}
      </div>

      <p>
        The future payment is unchanged. Increasing the rate or waiting longer
        lowers its value today because the discount factor becomes smaller.
      </p>
      <details>
        <summary>Assumptions and formula</summary>
        <p>
          This toy model uses a deterministic payment, integer years, and annual
          compounding: <code>D(0,t) = (1 + y)^(-t)</code> and{' '}
          <code>PV = cash flow × D(0,t)</code>.
        </p>
      </details>
    </section>
  );
}
