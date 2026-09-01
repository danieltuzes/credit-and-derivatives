---
key: terminal-random-payoff
latex: 'X_T'
title: Terminal random payoff
meaning: 'Signed amount delivered by a claim at the stated future horizon, before its outcome is known; positive means received and negative means paid by the claim holder.'
aliases:
  - contingent terminal payoff
domain: finance
units: stated currency at the future horizon
sources:
  - id: shreve-stochastic-calculus-finance-ii
    locator: 'Ch. 1 §1.3, printed pp. 13-18 (a random variable and its expectation), and Ch. 5 §5.2.4, printed pp. 218-219.'
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 7 §7.3, printed pp. 182-184, eqs. 7.7-7.8 (risk-neutral probabilities that recover market prices by expected discounted value).'
seeAlso:
  - risk-neutral-expectation
  - present-value
alignment:
  kind: competency
  introducedByCompetency: finance.risk-neutral-value.calculate
  introducedInLesson: foundations.risk-neutral-pricing
editorialStatus: draft
aiAssisted: true
---

The terminal random payoff $X_T$ is the signed amount delivered by a claim at
the stated future horizon before the outcome is known.

Its realized value may differ across scenarios. Positive amounts are receipts
and negative amounts are payments from the stated claim-holder perspective.
