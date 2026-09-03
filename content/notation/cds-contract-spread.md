---
key: cds-contract-spread
latex: 's'
meaning: 'Annualized premium rate applied to notional and each stated accrual year fraction; a positive rate paid by the protection buyer in the simplified lesson.'
aliases:
  - CDS premium rate
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed p. 362 (CDS spread as the annualized premium on a CDS with zero upfront payment).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.1, printed pp. 548-549 (periodic premium amount and CDS spread as an annual percentage of notional).'
seeAlso:
  - cds-notional
  - basis-point
alignment:
  kind: competency
  introducedByCompetency: cds.cash-flow-legs.interpret
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The contractual spread $s$ is the annualized premium rate in the lesson's
simplified premium leg. Code uses decimal-per-year units, so 100 basis points
per year is represented as $0.01$.

A contractual spread need not equal the par spread solved under a particular
valuation model after inception.
