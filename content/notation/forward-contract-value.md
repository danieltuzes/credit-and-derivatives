---
key: forward-contract-value
latex: 'V_t^{\mathrm{fwd}}'
meaning: "Signed current value of an existing forward from the named counterparty's perspective; positive to the long when the current forward price exceeds the contract's fixed delivery price under the lesson model."
domain: derivatives
units: stated currency at model time
sources:
  - id: hull-options-futures
    locator: 'Ch. 5 §5.7, printed pp. 109-111, Eqs. 5.4-5.7 (signed value of an existing long or short forward).'
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
