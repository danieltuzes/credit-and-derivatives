---
key: price-yield-curve
latex: 'P(y)'
meaning: 'Bond price as a function of yield while promised positive fixed cash flows remain constant and only the yield varies.'
aliases:
  - bond price as a function of yield
domain: bonds
units: stated currency per bond
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 3 §3.2, printed pp. 82-83, Eqs. 3.5-3.8 (bond price as a function of a single yield); Ch. 4 §4.7, printed pp. 119-120, Eqs. 4.20-4.21 (the fixed-cash-flow bond price-yield function).'
  - id: finra-bond-yield
    locator: '§ Understanding Bond Yield and Return, introductory paragraphs (inverse relationship between bond price and yield).'
seeAlso:
  - bond-price
  - yield-to-maturity
alignment:
  kind: competency
  introducedByCompetency: bonds.price-yield-curvature.interpret
  introducedInLesson: bonds.price-yield-relationship
editorialStatus: draft
aiAssisted: true
---

The price-yield curve $P(y)$ holds promised positive fixed cash flows constant
and evaluates [[bond-price]] across different
[[yield-to-maturity]] inputs.

In the toy model the curve slopes downward for non-negative yields and is not a
straight line. This page treats curvature qualitatively; duration and convexity
are separate later competencies.
