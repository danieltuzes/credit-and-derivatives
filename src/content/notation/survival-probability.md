---
key: survival-probability
latex: 'S(0,t)'
title: Survival probability
meaning: Probability, under the explicitly stated model measure, that no modeled default has occurred by a future time.
aliases:
  - default survival probability
domain: credit
units: probability between zero and one
perspective: Measured from valuation time through the stated future time under the named model measure.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
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
