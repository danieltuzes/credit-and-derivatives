---
key: periodic-rate
latex: 'r_m'
title: Periodic rate
meaning: 'Rate applied once in each compounding period under the stated convention, derived from the stated nominal annual quote in this model.'
aliases:
  - rate per period
domain: rates
units: decimal per compounding period
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 2 §2.1 (per-period rate implied by a nominal annual quote and its compounding frequency).'
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
