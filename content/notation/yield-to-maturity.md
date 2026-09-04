---
key: yield-to-maturity
latex: 'y^{(m_{\mathrm B})}'
meaning: 'Single nominal annual rate that reproduces the simplified bond price.'
aliases:
  - YTM
  - bond yield
domain: bonds
units: nominal annual decimal rate compounded at the bond payment frequency
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 3 §3.2, printed pp. 82-83, Eqs. 3.5-3.8 (yield to maturity as the single rate that discounts a bond’s cash flows to its market price).'
  - id: finra-bond-yield
    locator: "§ Key Terms (yield to maturity as the discount rate equating future coupon and principal cash flows to the bond's market price)."
seeAlso:
  - bond-price
  - bond-cash-flow
  - bond-payment-frequency
alignment:
  kind: competency
  introducedByCompetency: bonds.yield-to-maturity.interpret
  introducedInLesson: bonds.yield-to-maturity
editorialStatus: draft
aiAssisted: true
---

Yield to maturity $y^{(\explain{bond-payment-frequency}{m_{\mathrm B}})}$ is the
single nominal annual rate,
compounded at the stated [[bond-payment-frequency]], that reproduces the toy
[[bond-price]] from its promised cash flows.

In this slice it appears in

$$
P_0=\sum_{k=1}^{n}\frac{CF_k^{\mathrm{bond}}}
{\left(1+y^{(\explain{bond-payment-frequency}{m_{\mathrm B}})}/\explain{bond-payment-frequency}{m_{\mathrm B}}\right)^k}.
$$

It is not silently treated as the coupon rate, a spot rate, an effective annual
rate, a probability, or a guaranteed realized return.

**NEEDS_SOURCE:** verify exact textbook and official-guidance locators for the
quotation and interpretation before review.
