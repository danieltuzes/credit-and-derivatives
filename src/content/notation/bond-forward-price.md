---
key: bond-forward-price
latex: 'F^{B}_{0,T_{\mathrm{fwd}}}'
title: Bond forward price
meaning: Fair dirty delivery price fixed at valuation time for delivery of the named bond at the forward date.
domain: bonds
units: stated currency at forward delivery per bond
perspective: Positive delivery cash paid by the long under the lesson's no-arbitrage assumptions.
sources:
  - hull-options-futures
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
