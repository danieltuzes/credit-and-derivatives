---
key: risk-neutral-probability-measure
latex: '\mathbb{Q}'
title: Risk-neutral probability measure
meaning: 'Supplies model pricing weights under which discounted traded prices satisfy the martingale condition; it prices payoffs relative to a stated numeraire and is not a forecast of actual event frequencies.'
aliases:
  - equivalent martingale measure
  - pricing measure
domain: finance
units: dimensionless probability weights between zero and one
sources:
  - id: shreve-stochastic-calculus-finance-ii
    locator: 'Ch. 5 §5.2.2, printed pp. 214-217, eqs. 5.2.22-5.2.24 (the risk-neutral measure makes discounted traded prices martingales).'
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 7 §7.3, printed pp. 182-184, eqs. 7.7-7.8 (risk-neutral probabilities that recover market prices by expected discounted value).'
  - id: hull-options-futures
    locator: 'Ch. 12 §§12.1-12.3, printed pp. 253-261 (one- and two-step binomial replication, risk-neutral weights, discounted expected payoff, and backward induction).'
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
