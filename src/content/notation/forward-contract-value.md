---
key: forward-contract-value
notation: 'V_t^{\mathrm{fwd}}'
title: Forward contract value
summary: Signed current value of an existing forward from the named counterparty's perspective.
domain: derivatives
units: stated currency at model time t
perspective: Positive to the long when the current forward price exceeds the contract's fixed delivery price under the lesson model.
sources:
  - hull-options-futures
seeAlso:
  - forward-price
  - forward-delivery-price
alignment:
  kind: competency
  introducedByCompetency: derivatives.forward-value.calculate
  introducedInLesson: derivatives.forward-contracts-and-value
editorialStatus: draft
aiAssisted: true
---

The forward contract value $V_t^{\mathrm{fwd}}$ is a signed present value. A
new fair forward starts with zero value, but an existing forward can gain or
lose value when the current forward price changes.
