---
key: recovery-of-par-present-value
latex: 'PV_0^{\mathrm{RoP}}'
meaning: 'Present value of one maturity payment that is par after survival and a fixed fraction of par after earlier default; a positive asset value to the holder in the one-period recovery-of-par-paid-at-maturity model.'
aliases:
  - recovery-of-par PV
domain: credit
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.7, printed pp. 371-372, Table 14.11 and Eqs. 14.9-14.10; Appendix A14.4, printed pp. 507-508, Eq. A14.14 (defaultable-bond present value with recovery after default and full principal after survival).'
  - id: shreve-stochastic-calculus-finance-ii
    locator: 'Ch. 5 §5.2.4, printed p. 218, Eqs. 5.2.29-5.2.31 (the risk-neutral expected discounted payoff pricing formula).'
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
[[discount-factor]].

This definition does not cover recovery paid at default, recovery of market
value, coupons, multiple periods, or calibration.
