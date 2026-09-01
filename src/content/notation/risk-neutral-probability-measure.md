---
key: risk-neutral-probability-measure
notation: '\mathbb{Q}'
title: Risk-neutral probability measure
summary: Supplies model pricing weights under which discounted traded prices satisfy the martingale condition.
aliases:
  - equivalent martingale measure
  - pricing measure
domain: finance
units: dimensionless probability weights between zero and one
perspective: Prices payoffs relative to a stated numeraire; it is not a forecast of actual event frequencies.
sources:
  - shreve-stochastic-calculus-finance-ii
  - tuckman-serrat-fixed-income
  - hull-options-futures
seeAlso:
  - real-world-probability-measure
  - risk-neutral-expectation
alignment:
  kind: competency
  introducedByCompetency: finance.risk-neutral-measure.interpret
  introducedInLesson: foundations.risk-neutral-pricing
editorialStatus: draft
aiAssisted: true
---

The risk-neutral probability measure $\mathbb{Q}$ supplies the scenario weights
used by the stated no-arbitrage pricing model.

Relative to the chosen numeraire, discounted traded prices are martingales
under $\mathbb{Q}$. The name does not mean that outcomes are risk-free, that
volatility vanishes, or that all investors are indifferent to risk.
