---
key: forward-delivery-time
latex: 'T_{\mathrm{fwd}}'
title: Forward delivery time
meaning: "Future model time when the forward counterparties exchange the underlying and delivery payment; a contract date shared by the long and short, not the underlying asset's maturity."
domain: derivatives
units: model-years from the stated valuation time
sources:
  - id: hull-options-futures
    locator: 'Ch. 5 §§5.3-5.5, printed pp. 103-108 (cash-and-carry assumptions, the no-income forward price, and the known-income adjustment including a coupon-bond example).'
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
