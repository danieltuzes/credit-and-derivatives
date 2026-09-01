---
key: terminal-random-payoff
latex: 'X_T'
title: Terminal random payoff
meaning: Signed amount delivered by a claim at the stated future horizon, before its outcome is known.
aliases:
  - contingent terminal payoff
domain: finance
units: stated currency at the future horizon
perspective: Positive means received and negative means paid by the claim holder at the horizon.
sources:
  - shreve-stochastic-calculus-finance-ii
  - tuckman-serrat-fixed-income
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
