---
key: forward-price
notation: 'F_{t,T_{\mathrm{fwd}}}'
title: Current forward price
summary: Delivery price that would give a newly struck forward for the stated delivery time zero current value.
aliases:
  - fair forward delivery price
domain: derivatives
units: delivery-time currency per unit of underlying
perspective: Quoted contract rate rather than a cash amount received at quotation time.
sources:
  - hull-options-futures
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
