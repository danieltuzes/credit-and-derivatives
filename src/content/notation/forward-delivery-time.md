---
key: forward-delivery-time
notation: 'T_{\mathrm{fwd}}'
title: Forward delivery time
summary: Future model time when the forward counterparties exchange the underlying and delivery payment.
domain: derivatives
units: model-years from the stated valuation time
perspective: Contract date shared by the long and short; it is not the underlying asset's maturity.
sources:
  - hull-options-futures
seeAlso:
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: derivatives.forward-contract.interpret
  introducedInLesson: derivatives.forward-contracts-and-value
editorialStatus: draft
aiAssisted: true
---

The forward delivery time $T_{\mathrm{fwd}}$ is when the long pays the
contractual delivery price and receives the underlying. It is distinct from a
bond maturity or an option expiry.
