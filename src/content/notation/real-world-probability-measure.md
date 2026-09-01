---
key: real-world-probability-measure
latex: '\mathbb{P}'
title: Real-world probability measure
meaning: Assigns modeled probabilities intended to describe actual-world event likelihoods.
aliases:
  - physical probability measure
  - actual probability measure
domain: probability
units: dimensionless probability weights between zero and one
perspective: Used for forecasting and statistical statements under the stated real-world model.
sources:
  - shreve-stochastic-calculus-finance-ii
  - hull-options-futures
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
\term{risk-neutral-probability-measure}.
