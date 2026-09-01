---
key: cds-contract-spread
latex: 's'
title: CDS contractual spread
meaning: 'Annualized premium rate applied to notional and each stated accrual year fraction; a positive rate paid by the protection buyer in the simplified lesson.'
aliases:
  - CDS premium rate
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed pp. 361-366 (CDS contract, fee and contingent legs, quarterly premium, and default accrual).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.1, printed pp. 548-550 (CDS definition, quarterly premium, protection settlement, and accrued premium after a mid-period default).'
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
