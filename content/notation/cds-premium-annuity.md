---
key: cds-premium-annuity
latex: 'A_0^{\mathrm{prem}}'
meaning: "Present-value coefficient that multiplies contractual spread and notional in the simplified premium leg; positive, and includes scheduled premiums and exact accrued premium under the lesson's default-time model."
aliases:
  - risky premium annuity
domain: cds
units: model-years of present value per unit notional
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 368-370, Table 14.10 and Eq. 14.6; Appendix A14.2, printed p. 506, Eq. A14.5 (fee-leg coefficient from scheduled premiums plus half-period default accrual).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 552-553, Table 24.2 and Table 24.4 (present-value coefficients for scheduled and accrued premium payments).'
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
