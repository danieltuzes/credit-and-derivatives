---
key: cds-accrual-year-fraction
latex: '\alpha_i'
title: CDS premium accrual year fraction
meaning: 'Supplied year fraction that converts an annualized spread into the premium amount for one scheduled period; a positive model input.'
aliases:
  - premium accrual fraction
domain: cds
units: years under the explicitly stated synthetic schedule convention
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed pp. 361-366 (CDS contract, fee and contingent legs, quarterly premium, and default accrual).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 551-554, Tables 24.1-24.4 (survival/default weighting, scheduled premium, half-period default and accrual approximation, protection present value, and equal-leg spread).'
seeAlso:
  - cds-contract-spread
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: cds.premium-leg.calculate
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The accrual year fraction $\alpha_i$ is supplied directly in this lesson. It
converts the annualized \term{cds-contract-spread} into a period amount.

For the lesson's equal model-year periods, it is the arithmetic difference
between adjacent model times. This is not a claim about the calendar day-count
fraction of a market trade.
