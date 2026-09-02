---
key: cds-standard-coupon
latex: 'c_{\mathrm{std}}'
meaning: "Fixed annualized rate used to determine the contract's running premium cash flows in the lesson's standard-coupon model; a positive rate paid by the protection buyer on surviving notional and as accrued premium after default."
aliases:
  - standard coupon
  - fixed running coupon
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 366-370 and Table 14.10 (standardized 100- or 500-basis-point annual coupons and the resulting upfront amount); Appendix A14.2, printed p. 506, Eq. A14.7 (upfront amount from CDS spread less CDS coupon).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.4, printed pp. 556-557 (fixed coupon C and quarterly running payments on remaining notional).'
  - id: isda-cds-standard-model
    locator: 'ISDA Standard CDS Contract Converter Specification (version May 5, 2009), Specification, printed pp. 1-2 (the standard coupon as a user input and as the coupon rate determining premium-leg payment dates and amounts).'
seeAlso:
  - cds-contract-spread
  - cds-market-standard-quote
  - cds-premium-annuity
alignment:
  kind: competency
  introducedByCompetency: cds.market-standard-quote.interpret
  introducedInLesson: cds.market-standard-quote-and-upfront
editorialStatus: draft
aiAssisted: true
---

The standard coupon $c_{\mathrm{std}}$ is the fixed annualized rate that
determines running premium cash flows in this lesson's standardized contract.
It is converted from basis points per year to a decimal rate before
calculation.

The standard coupon is a contractual cash-flow input. It need not equal the
\term{cds-market-standard-quote}; a signed upfront amount balances the
difference at inception.
