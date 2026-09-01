---
key: cds-contract-spread
notation: 's'
title: CDS contractual spread
summary: Annualized premium rate applied to notional and each stated accrual year fraction.
aliases:
  - CDS premium rate
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
perspective: Positive rate paid by the protection buyer in the simplified lesson.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
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
