---
key: accumulation-factor
notation: 'A(0,t)'
title: Accumulation factor
aliases:
  - compounding factor
  - growth factor
domain: rates
units: dimensionless currency-units per current currency-unit
perspective: Grows a current unit to a future time under the stated rate model.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - periodic-rate
  - compounding-frequency
  - payment-time
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: rates.periodic-rate.calculate
  introducedInLesson: foundations.rates-compounding-and-basis-points
editorialStatus: draft
aiAssisted: true
---

The accumulation factor $A(0,t)$ grows one unit at
\term{valuation-time} to time $t$ under the stated compounding model.

Using \term{periodic-rate} $r_m$ and \term{compounding-frequency} $m$,

$$
A(0,t)=(1+r_m)^{mt}.
$$

Its reciprocal is called a discount factor. Keeping the two concepts separate
prevents the prototype's compounding factor from being mislabeled as its
inverse.
