---
key: accumulation-factor
latex: 'A(0,t)'
title: Accumulation factor
meaning: Grows one current unit over a stated future horizon under the selected rate model.
aliases:
  - compounding factor
  - growth factor
domain: rates
units: dimensionless currency-units per current currency-unit
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 2 §2.1 (compounding of an annualized rate); the accumulation factor is the reciprocal of the discount factor d(t) of Ch. 1 §1.2.'
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
