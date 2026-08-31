import { useId, useState } from 'react';

interface ChoiceOption {
  id: string;
  label: string;
}

interface AssessmentItemBase {
  id: string;
  evidenceKind: 'direct' | 'transfer';
  prompt: string;
  explanation: string;
}

interface ChoiceItem extends AssessmentItemBase {
  type: 'single-choice';
  options: ChoiceOption[];
  correctOptionId: string;
}

interface NumericItem extends AssessmentItemBase {
  type: 'numeric';
  answer: { value: number; tolerance: number };
}

type Item = ChoiceItem | NumericItem;

type Outcome = 'correct' | 'incorrect';

interface Props {
  title: string;
  items: Item[];
}

const evidenceLabel: Record<AssessmentItemBase['evidenceKind'], string> = {
  direct: 'Direct',
  transfer: 'Transfer',
};

function statusFor(outcome: Outcome | undefined): {
  tone: 'idle' | 'correct' | 'incorrect';
  label: string;
} {
  if (outcome === 'correct') return { tone: 'correct', label: 'Correct' };
  if (outcome === 'incorrect') return { tone: 'incorrect', label: 'Revisit' };
  return { tone: 'idle', label: 'Not answered' };
}

interface QuestionProps {
  item: Item;
  index: number;
  outcome: Outcome | undefined;
  onResult: (id: string, outcome: Outcome) => void;
  onReset: (id: string) => void;
}

function Question({ item, index, outcome, onResult, onReset }: QuestionProps) {
  const panelId = useId();
  const groupName = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [numeric, setNumeric] = useState('');

  const checked = outcome !== undefined;
  const parsed = Number(numeric);
  const numericFilled = numeric.trim() !== '' && Number.isFinite(parsed);
  const canCheck =
    item.type === 'single-choice' ? choice !== null : numericFilled;

  const evaluate = () => {
    const isCorrect =
      item.type === 'single-choice'
        ? choice === item.correctOptionId
        : numericFilled &&
          Math.abs(parsed - item.answer.value) <= item.answer.tolerance;
    onResult(item.id, isCorrect ? 'correct' : 'incorrect');
  };

  const retry = () => {
    onReset(item.id);
    setChoice(null);
    setNumeric('');
  };

  const status = statusFor(outcome);

  return (
    <li className="assessment-item">
      <h4 className="assessment-item-heading">
        <button
          type="button"
          className="assessment-disclosure"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="assessment-kind">
            {evidenceLabel[item.evidenceKind]}
          </span>
          <span className="assessment-item-title">Question {index}</span>
          <span className={`assessment-status is-${status.tone}`}>
            {status.label}
          </span>
          <svg
            className="assessment-chevron"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </h4>

      <div id={panelId} className="assessment-panel" hidden={!open}>
        <p className="assessment-prompt">{item.prompt}</p>

        {item.type === 'single-choice' ? (
          <fieldset className="assessment-choices">
            <legend className="sr-only">
              Answer options for question {index}
            </legend>
            {item.options.map((option) => (
              <label key={option.id} className="assessment-option">
                <input
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={choice === option.id}
                  disabled={checked}
                  onChange={() => setChoice(option.id)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        ) : (
          <label className="assessment-numeric" htmlFor={inputId}>
            <span className="sr-only">Numeric answer for question {index}</span>
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              value={numeric}
              disabled={checked}
              onChange={(event) => setNumeric(event.currentTarget.value)}
            />
          </label>
        )}

        <div className="assessment-actions">
          {checked ? (
            <button type="button" onClick={retry}>
              Try again
            </button>
          ) : (
            <button type="button" disabled={!canCheck} onClick={evaluate}>
              Check
            </button>
          )}
        </div>

        <p
          className={
            checked
              ? `assessment-feedback is-${outcome}`
              : 'assessment-feedback is-idle'
          }
          aria-live="polite"
        >
          {checked ? (
            <>
              <strong>
                {outcome === 'correct' ? 'Correct.' : 'Not quite.'}
              </strong>{' '}
              {item.explanation}
            </>
          ) : (
            'Check your answer to reveal the explanation.'
          )}
        </p>
      </div>
    </li>
  );
}

export default function AssessmentRunner({ title, items }: Props) {
  const headingId = useId();
  const [results, setResults] = useState<Record<string, Outcome>>({});

  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter(
    (value) => value === 'correct',
  ).length;

  const report = (id: string, outcome: Outcome) =>
    setResults((prev) => ({ ...prev, [id]: outcome }));
  const clear = (id: string) =>
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  return (
    <section className="assessment-shell" aria-labelledby={headingId}>
      <div className="assessment-header">
        <h3 id={headingId}>{title}</h3>
        <p className="assessment-progress" aria-live="polite">
          {answered === 0
            ? `${items.length} question${items.length === 1 ? '' : 's'}`
            : `${correct} of ${items.length} correct`}
        </p>
      </div>
      <ol className="assessment-list">
        {items.map((item, position) => (
          <Question
            key={item.id}
            item={item}
            index={position + 1}
            outcome={results[item.id]}
            onResult={report}
            onReset={clear}
          />
        ))}
      </ol>
    </section>
  );
}
