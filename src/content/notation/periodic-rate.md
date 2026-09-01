---
key: periodic-rate
latex: 'r_m'
title: Periodic rate
meaning: Rate applied once in each compounding period under the stated convention.
aliases:
  - rate per period
domain: rates
units: decimal per compounding period
perspective: Derived from the stated nominal annual quote in this model.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - nominal-annual-rate
  - compounding-frequency
  - accumulation-factor
alignment:
  kind: competency
  introducedByCompetency: rates.periodic-rate.calculate
  introducedInLesson: foundations.rates-compounding-and-basis-points
editorialStatus: draft
aiAssisted: true
---

The periodic rate $r_m$ is the rate applied once per compounding period.

For the nominal convention used here, it nests the
\term{nominal-annual-rate} and \term{compounding-frequency} definitions:

$$
r_m=\frac{j^{(m)}}{m}.
$$
