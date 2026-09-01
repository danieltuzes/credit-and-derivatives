---
key: cds-market-standard-quote
notation: 's_{\mathrm{MSQ}}'
title: CDS market-standard quote
summary: Conventional quoted spread treated as a zero-upfront par spread by the lesson's simplified converter.
aliases:
  - MSQ
  - conventional spread
  - quoted spread
domain: cds
units: decimal per year in calculations; basis points per year when explicitly quoted
perspective: A lesson-local name for the spread input used to infer pricing-model default risk; it is not necessarily the contract's fixed running coupon.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
  - isda-cds-standard-model
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
