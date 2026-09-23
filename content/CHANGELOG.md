# Knowledge changelog — Credit Products Playground

## [Unreleased]

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
