---
key: cds-standard-coupon
latex: 'c_{\mathrm{std}}'
title: CDS standard running coupon
meaning: "Fixed annualized rate used to determine the contract's running premium cash flows in the lesson's standard-coupon model; a positive rate paid by the protection buyer on surviving notional and as accrued premium after default."
aliases:
  - standard coupon
  - fixed running coupon
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 366-370, Tables 14.9-14.10 and eqs. 14.4-14.7 (event-weighted leg present values, fair-spread equality, standardized coupons, and spread/upfront conversion).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.4, printed pp. 556-557 (fixed coupon, implied hazard, and upfront price from a quoted spread).'
  - id: isda-cds-standard-model
    locator: 'ISDA Standard CDS Contract Converter Specification (version May 5, 2009), Functionality and Specification, printed p. 1 (standardized conversion between spread and upfront using a standard coupon, recovery rate, and discount inputs).'
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
