---
key: forward-delivery-time
latex: 'T_{\mathrm{fwd}}'
meaning: "Future model time when the forward counterparties exchange the underlying and delivery payment; a contract date shared by the long and short, not the underlying asset's maturity."
domain: derivatives
units: model-years from the stated valuation time
sources:
  - id: hull-options-futures
    locator: 'Ch. 5 §5.3, printed p. 103 (T as time until the forward or futures delivery date).'
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
