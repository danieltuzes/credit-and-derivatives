---
key: bond-price
latex: 'P_0'
meaning: "Present value of the simplified bond's promised payments at valuation time; the amount paid by the buyer, shown as a positive value in this slice."
aliases:
  - dirty price in the settlement-on-coupon-date toy model
  - present value of promised bond cash flows
domain: bonds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §1.2, printed pp. 51-52, Eqs. 1.1-1.3 (bond price as the sum of promised cash flows times dated discount factors).'
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

The bond price $P_0$ is the [[present-value]] of the simplified bond's
promised [[bond-cash-flow]] amounts.

Given one [[discount-factor]] for each scheduled time,

$$
P_0=\sum_{k=1}^{n}CF_k^{\mathrm{bond}}D(0,t_k).
$$

Settlement is on a coupon date here, so this slice does not yet distinguish
clean price, accrued interest, and dirty price.
