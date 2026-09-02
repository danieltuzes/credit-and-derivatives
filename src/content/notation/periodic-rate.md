---
key: periodic-rate
latex: 'r_m'
meaning: 'Rate applied once in each compounding period under the stated convention, derived from the stated nominal annual quote in this model.'
aliases:
  - rate per period
domain: rates
units: decimal per compounding period
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 2 §2.1, printed p. 67, Eq. 2.7 (per-period rate r-hat divided by n from an annual rate compounded n times per year).'
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
[[nominal-annual-rate]] and [[compounding-frequency]] definitions:

$$
r_m=\frac{j^{(m)}}{m}.
$$
