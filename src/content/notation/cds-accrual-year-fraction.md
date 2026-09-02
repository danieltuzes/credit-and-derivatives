---
key: cds-accrual-year-fraction
latex: '\alpha_i'
meaning: 'Supplied year fraction that converts an annualized spread into the premium amount for one scheduled period; a positive model input.'
aliases:
  - premium accrual fraction
domain: cds
units: years under the explicitly stated synthetic schedule convention
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed p. 362 (quarterly premium until default or maturity); Appendix A14.2, printed p. 506, Eq. A14.5 (period day-count fraction applied to the annual CDS spread).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.1, printed pp. 548-549 (periodic premium amount, day-count adjustment, and accrued premium after default), and §24.2, printed pp. 552-553, Table 24.4 (half-period accrued-premium approximation).'
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
converts the annualized [[cds-contract-spread]] into a period amount.

For the lesson's equal model-year periods, it is the arithmetic difference
between adjacent model times. This is not a claim about the calendar day-count
fraction of a market trade.
