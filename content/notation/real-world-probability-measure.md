---
key: real-world-probability-measure
latex: '\mathbb{P}'
meaning: 'Assigns modeled probabilities intended to describe actual-world event likelihoods; used for forecasting and statistical statements under the stated real-world model.'
aliases:
  - physical probability measure
  - actual probability measure
domain: probability
units: dimensionless probability weights between zero and one
sources:
  - id: shreve-stochastic-calculus-finance-ii
    locator: 'Ch. 1 §1.6, printed p. 35 (actual and risk-neutral probability measures and their distinct roles).'
  - id: hull-options-futures
    locator: 'Ch. 23 §23.5, printed pp. 528-530 (risk-neutral versus real-world default probabilities).'
seeAlso:
  - risk-neutral-probability-measure
alignment:
  kind: competency
  introducedByCompetency: finance.risk-neutral-measure.interpret
  introducedInLesson: foundations.risk-neutral-pricing
editorialStatus: draft
aiAssisted: true
---

The real-world probability measure $\mathbb{P}$ assigns modeled probabilities
intended to describe actual-world event likelihoods.

It is the measure used when the question is a forecast rather than an
arbitrage-consistent price. A model's probabilities under $\mathbb{P}$ need
not equal its pricing weights under the
[[risk-neutral-probability-measure]].
