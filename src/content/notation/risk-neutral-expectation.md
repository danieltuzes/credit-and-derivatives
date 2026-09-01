---
key: risk-neutral-expectation
latex: '\mathbb{E}^{\mathbb{Q}}'
title: Risk-neutral expectation
meaning: 'Averages a random quantity using probabilities supplied by the risk-neutral measure, that is, pricing weights rather than real-world forecast probabilities.'
aliases:
  - Q-expectation
domain: finance
units: same units as the quantity inside the expectation
sources:
  - id: shreve-stochastic-calculus-finance-ii
    locator: 'Ch. 5 §5.2.4, printed pp. 218-219, eqs. 5.2.29-5.2.31 (the risk-neutral expected discounted payoff pricing formula).'
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 7 §7.3, printed pp. 182-184, eqs. 7.7-7.8 (risk-neutral probabilities that recover market prices by expected discounted value).'
  - id: hull-options-futures
    locator: 'Ch. 14 §14.7, printed pp. 311-313 (risk-neutral valuation as expected payoff under pricing probabilities discounted at the risk-free rate, distinct from real-world probabilities).'
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
