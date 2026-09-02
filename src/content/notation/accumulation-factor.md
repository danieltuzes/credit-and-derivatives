---
key: accumulation-factor
latex: 'A(0,t)'
meaning: Grows one current unit over a stated future horizon under the selected rate model.
aliases:
  - compounding factor
  - growth factor
domain: rates
units: dimensionless currency-units per current currency-unit
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 2 §2.4, printed pp. 73-74, Eqs. 2.17-2.19 (growth of one current currency unit to time t and the reciprocal relation between that growth factor and d(t)).'
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
[[valuation-time]] to time $t$ under the stated compounding model.

Using [[periodic-rate]] $r_m$ and [[compounding-frequency]] $m$,

$$
A(0,t)=(1+r_m)^{mt}.
$$

Its reciprocal is called a discount factor. Keeping the two concepts separate
prevents the prototype's compounding factor from being mislabeled as its
inverse.
