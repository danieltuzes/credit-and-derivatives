---
key: cds-accrual-year-fraction
latex: '\alpha_i'
title: CDS premium accrual year fraction
meaning: Supplied year fraction that converts an annualized spread into the premium amount for one scheduled period.
aliases:
  - premium accrual fraction
domain: cds
units: years under the explicitly stated synthetic schedule convention
perspective: Positive supplied model input for one premium period.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
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
