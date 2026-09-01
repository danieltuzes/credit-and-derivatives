---
key: cds-market-standard-quote
latex: 's_{\mathrm{MSQ}}'
title: CDS market-standard quote
meaning: "Conventional quoted spread treated as a zero-upfront par spread by the lesson's simplified converter; a name for the spread input used to infer pricing-model default risk, not necessarily the contract's fixed running coupon."
aliases:
  - MSQ
  - conventional spread
  - quoted spread
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
  - cds-par-spread
  - hazard-rate
  - basis-point
alignment:
  kind: competency
  introducedByCompetency: cds.market-standard-quote.interpret
  introducedInLesson: cds.market-standard-quote-and-upfront
editorialStatus: draft
aiAssisted: true
---

This lesson uses **market-standard quote**, abbreviated MSQ, for the
conventional quoted spread supplied to its simplified converter. The label is
local to this lesson; it is not presented as universal market terminology.

The converter treats $s_{\mathrm{MSQ}}$ as a zero-upfront par spread to infer
one flat pricing-model hazard rate. The resulting rate can differ from the
fixed running coupon that actually determines premium cash flows.
