---
key: cds-par-spread
latex: 's^{\star}'
title: CDS par spread in the zero-upfront toy model
meaning: "Contractual spread that makes the two positive leg magnitudes equal at valuation time with zero upfront amount, solved under the lesson's supplied curves, recovery, timing, and accrued-premium convention."
aliases:
  - zero-upfront par spread
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 366-370, eqs. 14.4-14.7 (fair spread equating the two legs), and Appendix A14.1-A14.2, printed pp. 505-507.'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 551-554, Tables 24.1-24.4 (survival/default weighting, scheduled premium, half-period default and accrual approximation, protection present value, and equal-leg spread).'
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
\term{cds-protection-leg-present-value} magnitude and the
\term{cds-premium-annuity} under the same assumptions.

It is not a standard-coupon/upfront quote and does not include calibration or
transaction-specific adjustments.
