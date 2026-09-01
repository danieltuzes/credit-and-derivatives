---
key: forward-price
latex: 'F_{t,T_{\mathrm{fwd}}}'
title: Current forward price
meaning: 'Delivery price that would give a newly struck forward for the stated delivery time zero current value; a quoted contract rate rather than a cash amount received at quotation time.'
aliases:
  - fair forward delivery price
domain: derivatives
units: delivery-time currency per unit of underlying
sources:
  - id: hull-options-futures
    locator: 'Ch. 5 §§5.3-5.5, printed pp. 103-108 (cash-and-carry assumptions, the no-income forward price, and the known-income adjustment including a coupon-bond example).'
seeAlso:
  - forward-delivery-price
  - forward-contract-value
alignment:
  kind: competency
  introducedByCompetency: derivatives.forward-delivery-price.calculate
  introducedInLesson: derivatives.forward-contracts-and-value
editorialStatus: draft
aiAssisted: true
---

The forward price $F_{t,T_{\mathrm{fwd}}}$ is the delivery price that makes a
new forward maturing at $T_{\mathrm{fwd}}$ worth zero at time $t$ under the
stated carry model. It differs from the fixed delivery price of an older
contract.
