---
key: cds-par-spread
latex: 's^{\star}'
meaning: "Contractual spread that makes the two positive leg magnitudes equal at valuation time with zero upfront amount, solved under the lesson's supplied curves, recovery, timing, and accrued-premium convention."
aliases:
  - zero-upfront par spread
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 368-370, Table 14.10 and Eqs. 14.6-14.7; Appendix A14.2, printed p. 506, Eqs. A14.5-A14.6 (fair CDS spread equating fee- and contingent-leg values).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 551-553, Tables 24.2-24.4 (premium and protection present values equated to determine the par CDS spread).'
seeAlso:
  - cds-premium-annuity
  - cds-protection-leg-present-value
alignment:
  kind: competency
  introducedByCompetency: cds.par-spread.calculate
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The par spread $s^{\star}$ is the contractual spread that makes the positive
premium-leg and protection-leg magnitudes equal at valuation time in the stated
toy model. It is calculated from the
[[cds-protection-leg-present-value]] magnitude and the
[[cds-premium-annuity]] under the same assumptions.

It is not a standard-coupon/upfront quote and does not include calibration or
transaction-specific adjustments.
