# Knowledge changelog — Credit Products Playground

## [Unreleased]

- Rewrote lesson prose, notation-card text, competency outcomes, and assessment
  wording to follow the explico prose rules (P1–P9): one term for each concept,
  literal wording, one claim per sentence, relation words that match the
  mathematics, and display equations introduced by what they give. No
  formula, input value, result, or answer key changed.
- Replaced the undefined word "supplied" with "input" across the course, and
  stated in the survival lesson that the survival curve is an input there and
  is fitted to market prices in practice (see the CDS credit-curve lesson).
- Renamed figurative section headings; some in-page anchors changed.
- Upgraded the course engine to explico 0.11.1. Every equation, diagram,
  knowledge check, and example set is now numbered `‹part›.‹chapter›.‹n›`
  (for example, equation 1.5.1 was 5.1), and lesson sections show outline
  numbers. The positional anchor of an unlabelled equation changed with its
  number (for example, `#eq-4-2` is now `#eq-1-4-2`).
- Gave each worked-example set a topical title and a stable `#ex-…` anchor,
  and gave each diagram a short title with its former description as the
  caption.
- Dropped "check" from knowledge-check titles, which now follow a "Knowledge
  check" badge, and removed the "Check your understanding" heading where it
  only announced the check below it.
- Shortened the credit-curve heading "What the market shows, what the model
  assumes, what the model solves"; its anchor changed.
- Removed sentence punctuation from the end of display equations, sized every
  nested bracket with `\left`/`\right`, and wrote the arithmetic in five
  assessment explanations as typeset math in the lessons' notation. No
  formula, input value, result, or answer key changed.
- Added explanations for the abbreviations CDS, CDX, DTS, FINRA, IMM, ISDA,
  ISO, JTD, and UTC.
- Added an overview page for each of the seven parts: how the part builds on
  the earlier parts, what it covers, the argument through its chapters, and
  its chapter list. The homepage now lists every part and chapter, and its
  buttons lead to the first part, the contents, the CDS part, and the
  curriculum map.
- Gave six tables a number, a title, and a caption: the price-yield sign
  table, the observed-versus-solved and jargon tables of the credit-curve
  lesson, the quote-conversion inputs, the rate representations, and the
  risk-neutral worked example. Tables inside worked examples stay unnumbered.
- Merged notation that two lessons declared twice into one shared entry each:
  the default time, the lattice node discount factor and up weight, and the
  present value of the underlying's income. The default time is now stated as
  τ > 0, which follows from S(0,0) = 1; the survival lesson previously stated
  τ ≥ 0.

## [0.4.0] - 2026-09-23

- Added a lesson on the credit curve and market observables: what the CDS
  market shows versus what a converter assumes or solves, why one traded
  upfront per tenor identifies the pricing hazard rate, the marked curve
  versus the fitted piecewise-constant hazard curve, curve transformation
  versus curve fitting, and a jargon note.
- Added a lesson on the liquid-tenor equivalent notional: bump-and-reprice
  risky DV01, the equivalent notional and ratio that offset a position's
  quote risk, and its invariance to quoting in spread, upfront, or par
  spread terms.
- Added the piecewise-constant hazard curve fit and the liquid-tenor
  equivalent domain calculations with reference, invariant, and
  invalid-input tests.
- Added the discount curve lesson to the credit products track as a
  prerequisite of the credit curve lesson.

## [0.3.0] - 2026-09-17

- Added a section distinguishing which quantities are supplied versus solved
  in the CDS quote/upfront conversion, and a section proving the
  market-standard quote equals the par spread within one internally
  consistent model.
- Clarified assumptions and introduced general hazard-rate notation in the
  premium protection legs and par spread lesson; added a new section on
  extinguishing swaps, covering their construction and valuation.

## [0.2.0] - 2026-09-06

- Upgrade the course engine to explico 0.3.0 and surface the reader-facing
  course identity and knowledge version.
- Use chapter-scoped equation references instead of positional descriptions in
  the updated lessons.
- Add reproducible calculations and new-engine flow diagrams to the three
  lessons that lacked worked examples.
- Complete the missing notation-unit metadata and standardize unit phrases.

## [0.1.0] - 2026-09-04

- Initial prerequisite-aware course in credit products and derivatives.
