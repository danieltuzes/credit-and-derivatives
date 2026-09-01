---
key: bond-price
latex: 'P_0'
title: Bond price at valuation time
meaning: Present value of the simplified bond's promised payments at valuation time.
aliases:
  - dirty price in the settlement-on-coupon-date toy model
  - present value of promised bond cash flows
domain: bonds
units: stated currency at valuation time
perspective: Amount paid by the buyer; displayed as a positive value in this slice.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - bond-cash-flow
  - discount-factor
  - present-value
alignment:
  kind: competency
  introducedByCompetency: bonds.price-from-discount-factors.calculate
  introducedInLesson: bonds.price-from-discount-factors
editorialStatus: draft
aiAssisted: true
---

The bond price $P_0$ is the \term{present-value} of the simplified bond's
promised \term{bond-cash-flow} amounts.

Given one \term{discount-factor} for each scheduled time,

$$
P_0=\sum_{k=1}^{n}CF_k^{\mathrm{bond}}D(0,t_k).
$$

Settlement is on a coupon date here, so this slice does not yet distinguish
clean price, accrued interest, and dirty price.
