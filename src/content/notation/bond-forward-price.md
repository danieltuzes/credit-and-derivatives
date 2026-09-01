---
key: bond-forward-price
latex: 'F^{B}_{0,T_{\mathrm{fwd}}}'
title: Bond forward price
meaning: "Fair dirty delivery price fixed at valuation time for delivery of the named bond at the forward date; positive delivery cash paid by the long under the lesson's no-arbitrage assumptions."
domain: bonds
units: stated currency at forward delivery per bond
sources:
  - id: hull-options-futures
    locator: 'Ch. 5 §§5.3-5.5, printed pp. 103-108 (known-income forward price, including a coupon-bond example), and §5.7, printed pp. 109-111.'
seeAlso:
  - forward-price
  - dirty-bond-price
  - forward-delivery-time
alignment:
  kind: competency
  introducedByCompetency: bonds.forward-delivery-price.calculate
  introducedInLesson: bonds.bond-forwards
editorialStatus: draft
aiAssisted: true
---

The bond forward price uses dirty cash units. Coupons whose record and payment
terms place them before delivery are income to the current bond owner, not the
forward buyer.
