---
key: cds-standard-coupon
latex: 'c_{\mathrm{std}}'
title: CDS standard running coupon
meaning: Fixed annualized rate used to determine the contract's running premium cash flows in the lesson's standard-coupon model.
aliases:
  - standard coupon
  - fixed running coupon
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
perspective: Positive annualized rate paid by the protection buyer on surviving notional and as accrued premium after default under the stated model.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
  - isda-cds-standard-model
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
