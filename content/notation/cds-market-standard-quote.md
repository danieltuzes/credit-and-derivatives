---
key: cds-market-standard-quote
latex: 's_{\mathrm{MSQ}}'
meaning: "Conventional quoted spread treated as a zero-upfront par spread by the lesson's simplified converter; a name for the spread input used to infer pricing-model default risk, not necessarily the contract's fixed running coupon."
aliases:
  - MSQ
  - conventional spread
  - quoted spread
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed p. 362 (CDS spread as the annualized zero-upfront premium); Ch. 14 §14.6, printed pp. 366-370, Table 14.10 and Eqs. 14.4-14.7 (standard coupons and spread-to-upfront conversion).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.4, printed pp. 556-557 (quoted spread, implied hazard rate, fixed coupon, and price or up-front amount).'
  - id: isda-cds-standard-model
    locator: 'ISDA Standard CDS Contract Converter Specification (version May 5, 2009), Specification, printed pp. 1 and 4 (spread/upfront conversion; a spread input is treated as the coupon on a zero-upfront CDS to solve the constant hazard rate).'
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
