---
key: interval-default-probability
latex: '\Delta q_i'
meaning: 'Probability assigned by the model to first default during one stated time interval, conditional only through the supplied survival curve construction.'
aliases:
  - marginal default probability
domain: credit
units: probability between zero and one
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Appendix A14.2, printed p. 506, Eqs. A14.5-A14.7 (interval default probability as the difference between successive cumulative survival probabilities in CDS leg and upfront formulas).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 551-552, Table 24.1 (per-period unconditional default and survival probabilities).'
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
