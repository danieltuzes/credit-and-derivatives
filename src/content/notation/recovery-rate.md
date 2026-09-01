---
key: recovery-rate
latex: 'R'
title: Recovery rate
meaning: 'Fraction of a stated reference amount recovered after a modeled default under an explicitly stated recovery convention; a non-negative fraction whose reference amount, payment timing, and settlement convention are set by the model that uses it.'
aliases:
  - recovery fraction
domain: credit
units: decimal fraction between zero and one
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed pp. 361-366 (recovery fraction of notional after default).'
seeAlso: []
alignment:
  kind: competency
  introducedByCompetency: credit.recovery-rate.interpret
  introducedInLesson: credit.recovery-and-risky-present-value
editorialStatus: draft
aiAssisted: true
---

The recovery rate $R$ is a fraction between zero and one. It does not, by
itself, specify the amount to which recovery applies or when recovery is paid.
Those choices belong to the surrounding model.

The one-period credit lesson applies $R$ to par paid at maturity. The CDS
lesson uses $1-R$ as its deterministic loss-given-default fraction and states
its exact modeled default-time payment separately. Neither use is an observed
recovery estimate or a universal contractual rule.
