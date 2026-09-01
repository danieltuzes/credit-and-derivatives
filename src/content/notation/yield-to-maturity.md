---
key: yield-to-maturity
latex: 'y^{(m_{\mathrm B})}'
title: Yield to maturity
meaning: 'Single nominal annual rate that reproduces the simplified bond price.'
aliases:
  - YTM
  - bond yield
domain: bonds
units: nominal annual decimal rate compounded at the bond payment frequency
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 3 §3.2 (yield to maturity as the single rate that reproduces a bond price).'
  - id: finra-bond-yield
    locator: "Sections 'What Is Yield?' and 'Yield to Maturity' (yield to maturity as the discount rate that equates all future cash flows to the current price)."
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

Yield to maturity $y^{(m_{\mathrm B})}$ is the single nominal annual rate,
compounded at the stated \term{bond-payment-frequency}, that reproduces the toy
\term{bond-price} from its promised cash flows.

In this slice it appears in

$$
P_0=\sum_{k=1}^{n}\frac{CF_k^{\mathrm{bond}}}
{\left(1+y^{(m_{\mathrm B})}/m_{\mathrm B}\right)^k}.
$$

It is not silently treated as the coupon rate, a spot rate, an effective annual
rate, a probability, or a guaranteed realized return.

**NEEDS_SOURCE:** verify exact textbook and official-guidance locators for the
quotation and interpretation before review.
