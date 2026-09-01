---
key: cds-premium-annuity
latex: 'A_0^{\mathrm{prem}}'
title: CDS premium annuity per unit notional
meaning: Present-value coefficient that multiplies contractual spread and notional in the simplified premium leg.
aliases:
  - risky premium annuity
domain: cds
units: model-years of present value per unit notional
perspective: Positive coefficient including scheduled premiums and exact accrued premium under the lesson's default-time model.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
seeAlso:
  - cds-accrual-year-fraction
  - survival-probability
  - interval-default-probability
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: cds.premium-leg.calculate
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The premium annuity $A_0^{\mathrm{prem}}$ is the positive per-unit-notional
coefficient multiplying the contractual spread. It always includes scheduled
survival-contingent premiums and exact expected premium accrued at modeled
default time.

The accrued term integrates the elapsed accrual fraction, discount factor, and
risk-neutral default density inside every period. The textbook half-period
method remains a comparison approximation, not the definition used by the
lesson's exact flat-hazard engine.
