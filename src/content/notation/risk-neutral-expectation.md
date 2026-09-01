---
key: risk-neutral-expectation
latex: '\mathbb{E}^{\mathbb{Q}}'
title: Risk-neutral expectation
meaning: Averages a random quantity using probabilities supplied by the risk-neutral measure.
aliases:
  - Q-expectation
domain: finance
units: same units as the quantity inside the expectation
perspective: Uses pricing weights rather than real-world forecast probabilities.
sources:
  - shreve-stochastic-calculus-finance-ii
  - tuckman-serrat-fixed-income
  - hull-options-futures
seeAlso:
  - risk-neutral-probability-measure
  - terminal-random-payoff
alignment:
  kind: competency
  introducedByCompetency: finance.risk-neutral-value.calculate
  introducedInLesson: foundations.risk-neutral-pricing
editorialStatus: draft
aiAssisted: true
---

The risk-neutral expectation operator averages a random quantity using the
weights from the \term{risk-neutral-probability-measure}.

Applied to a \term{terminal-random-payoff}, its result has the same
future-currency units as the quantity being averaged; discounting is a separate
step.
