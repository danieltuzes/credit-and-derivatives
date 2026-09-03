import { useEffect, useId, useState } from 'react';

import {
  noopAnalyticsEmitter,
  type AnalyticsEmitter,
} from '../../analytics/AnalyticsEmitter';
import {
  noopProgressRepository,
  type AssessmentAttempt,
  type ProgressRepository,
} from '../../progress/ProgressRepository';
import { useSessionUser } from '../../session/user-context';

interface ChoiceOption {
  id: string;
  label: string;
}

interface AssessmentItemBase {
  id: string;
  competencyId?: string;
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
  /** Assessment collection id — scopes recorded attempts and analytics events. */
  assessmentId: string;
  title: string;
  items: Item[];
  /**
   * Seams (Phase H1). Both default to the no-op implementations the static
   * site ships; a future SSR/LMS host injects real ones without changing the
   * component. Props exist so tests can observe the calls.
   */
  progress?: ProgressRepository;
  analytics?: AnalyticsEmitter;
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

export default function AssessmentRunner({
  assessmentId,
  title,
  items,
  progress = noopProgressRepository,
  analytics = noopAnalyticsEmitter,
}: Props) {
  const headingId = useId();
  const user = useSessionUser();
  const [results, setResults] = useState<Record<string, Outcome>>({});

  const itemById = new Map(items.map((item) => [item.id, item]));

  // Seed from any previously recorded attempts. The no-op repository returns an
  // empty snapshot, so this is inert in the static build.
  useEffect(() => {
    let live = true;
    void Promise.resolve(progress.load(user)).then((snapshot) => {
      if (!live) return;
      const seeded: Record<string, Outcome> = {};
      for (const attempt of snapshot.attempts) {
        if (
          attempt.assessmentId === assessmentId &&
          itemById.has(attempt.itemId)
        ) {
          seeded[attempt.itemId] = attempt.outcome;
        }
      }
      if (Object.keys(seeded).length > 0) setResults(seeded);
    });
    return () => {
      live = false;
    };
    // `assessmentId` and the repository identity are the only real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, progress, user]);

  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter(
    (value) => value === 'correct',
  ).length;

  const report = (id: string, outcome: Outcome) => {
    setResults((prev) => ({ ...prev, [id]: outcome }));
    const item = itemById.get(id);
    const attempt: AssessmentAttempt = {
      assessmentId,
      itemId: id,
      ...(item?.competencyId ? { competencyId: item.competencyId } : {}),
      evidenceKind: item?.evidenceKind ?? 'direct',
      outcome,
      at: Date.now(),
    };
    void progress.recordAttempt(user, attempt);
    analytics.emit({
      name: 'assessment.attempt',
      at: attempt.at,
      props: {
        assessmentId,
        itemId: id,
        outcome,
        evidenceKind: attempt.evidenceKind,
      },
    });
  };
  const clear = (id: string) => {
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void progress.reset(user, { assessmentId, itemId: id });
    analytics.emit({
      name: 'assessment.retry',
      at: Date.now(),
      props: { assessmentId, itemId: id },
    });
  };

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
