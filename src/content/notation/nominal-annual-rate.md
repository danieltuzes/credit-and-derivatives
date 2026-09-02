---
key: nominal-annual-rate
latex: 'j^{(m)}'
meaning: Annualized rate quote that must be paired with its compounding frequency.
aliases:
  - nominal rate
  - annualized rate
domain: rates
units: decimal per year in code; percent per year in labeled prose and UI
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 2 §2.1, printed pp. 66-67, Eq. 2.7 (annual rate quote paired with n compounding periods per year).'
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
obtained using its stated [[compounding-frequency]] $m$.

In this playground's nominal-compounding model,

$$
r_m=\frac{j^{(m)}}{m}.
$$

It is not silently interchangeable with an effective annual rate.

**NEEDS_SOURCE:** verify the exact textbook locator for this quotation
convention before review.
