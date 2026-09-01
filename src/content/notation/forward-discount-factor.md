---
key: forward-discount-factor
latex: 'Z(t,T)'
title: Forward discount factor
meaning: Value at future model time t of one currency unit paid at later model time T under the stated deterministic curve.
aliases:
  - future-to-future discount factor
domain: rates
units: currency at time t per one unit of the same currency at time T
perspective: Positive deterministic factor implied by one stated valuation-time curve, with t strictly before T.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - discount-factor
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: rates.forward-discount-factor.calculate
  introducedInLesson: rates.discount-curve-and-forward-discounting
editorialStatus: draft
aiAssisted: true
---

The forward discount factor compares the values of the same later payment at
two different model times. This deterministic-curve definition does not claim
that future discount factors are known in a stochastic-rate model.

The glyph $Z$ keeps this future-to-future factor distinct from the shared
valuation-time discount-factor glyph $D$; no existing glyph is rebound.
