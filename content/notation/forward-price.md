---
key: forward-price
latex: 'F_{t,T_{\mathrm{fwd}}}'
meaning: 'Delivery price that would give a newly struck forward for the stated delivery time zero current value; a quoted contract rate rather than a cash amount received at quotation time.'
aliases:
  - fair forward delivery price
domain: derivatives
units: delivery-time currency per unit of underlying
sources:
  - id: hull-options-futures
    locator: 'Ch. 5 §5.3, printed p. 103 (forward price F_0 and delivery time T), §§5.4-5.5, printed pp. 104-108, Eqs. 5.1-5.2 (no-arbitrage forward prices), and §5.7, printed pp. 109-110 (current forward price versus fixed delivery price).'
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

The forward price $F_{t,\explain{forward-delivery-time}{T_{\mathrm{fwd}}}}$ is
the delivery price that makes a new forward maturing at
$\explain{forward-delivery-time}{T_{\mathrm{fwd}}}$ worth zero at time $t$ under the
stated carry model. It differs from the fixed delivery price of an older
contract.
