---
key: interval-default-probability
latex: '\Delta q_i'
title: Interval default probability
meaning: Probability assigned by the model to first default during one stated time interval.
aliases:
  - marginal default probability
domain: credit
units: probability between zero and one
perspective: Applies to one interval conditional only through the supplied survival curve construction.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
seeAlso:
  - survival-probability
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: credit.default-probability-from-survival.calculate
  introducedInLesson: credit.default-hazard-and-survival
editorialStatus: draft
aiAssisted: true
---

For two ordered endpoints, the interval default probability is the earlier
\term{survival-probability} minus the later survival probability. Lessons add
an explicit schedule index when they apply that subtraction.

This draft assumes at most one modeled default and a non-increasing supplied
survival curve.
