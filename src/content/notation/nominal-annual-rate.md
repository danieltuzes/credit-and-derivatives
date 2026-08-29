---
key: nominal-annual-rate
notation: 'j^{(m)}'
title: Nominal annual rate
aliases:
  - nominal rate
  - annualized rate
domain: rates
units: decimal per year in code; percent per year in labeled prose and UI
perspective: A quote that must be paired with its compounding frequency.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - compounding-frequency
  - periodic-rate
alignment:
  kind: competency
  introducedByCompetency: rates.nominal-rate-quote.interpret
  introducedInLesson: foundations.rates-compounding-and-basis-points
editorialStatus: draft
aiAssisted: true
---

The nominal annual rate $j^{(m)}$ is an annualized quote whose periodic rate is
obtained using its stated \term{compounding-frequency} $m$.

In this playground's nominal-compounding model,

$$
r_m=\frac{j^{(m)}}{m}.
$$

It is not silently interchangeable with an effective annual rate.

**NEEDS_SOURCE:** verify the exact textbook locator for this quotation
convention before review.
