---
key: recovery-of-par-present-value
latex: 'PV_0^{\mathrm{RoP}}'
title: One-period recovery-of-par present value
meaning: Present value of one maturity payment that is par after survival and a fixed fraction of par after earlier default.
aliases:
  - recovery-of-par PV
domain: credit
units: stated currency at valuation time
perspective: Positive asset value to the holder in the one-period recovery-of-par-paid-at-maturity model.
sources:
  - tuckman-serrat-fixed-income
  - shreve-stochastic-calculus-finance-ii
seeAlso:
  - present-value
  - survival-probability
  - recovery-rate
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: credit.risky-present-value.calculate
  introducedInLesson: credit.recovery-and-risky-present-value
editorialStatus: draft
aiAssisted: true
---

The one-period recovery-of-par present value $PV_0^{\mathrm{RoP}}$ combines a
survival-state par payment and a default-state recovered-par payment, both paid
at the same scheduled maturity and discounted by the same supplied
\term{discount-factor}.

This definition does not cover recovery paid at default, recovery of market
value, coupons, multiple periods, or calibration.
