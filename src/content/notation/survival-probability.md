---
key: survival-probability
latex: 'S(0,t)'
title: Survival probability
meaning: 'Probability, under the explicitly stated model measure, that no modeled default has occurred between valuation time and a stated future time.'
aliases:
  - default survival probability
domain: credit
units: probability between zero and one
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5 and Appendix A14.1, printed pp. 361-366 and 505-506 (constant-hazard survival probability).'
  - id: hull-options-futures
    locator: 'Ch. 23 §23.2, printed pp. 522-523 (default intensity/hazard rate and survival probability).'
seeAlso:
  - valuation-time
  - payment-time
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: credit.survival-probability.interpret
  introducedInLesson: credit.default-hazard-and-survival
editorialStatus: draft
aiAssisted: true
---

The survival probability $S(0,t)$ is the probability, under the explicitly
named model measure, that the modeled reference entity has not defaulted from
\term{valuation-time} through future time $t$.

It is a probability, not a \term{discount-factor}. A lesson must say whether
the probability is a pricing-model input or a real-world estimate; the draft
credit and CDS lessons use supplied pricing-model probabilities.
