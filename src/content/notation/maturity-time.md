---
key: maturity-time
latex: 'T'
title: Maturity time
meaning: Final scheduled time when principal is redeemed in the simplified bond.
aliases:
  - term to maturity
domain: bonds
units: years from the valuation date in the simplified model
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §1.1 and Table 1.1, printed p. 50 (coupon rate, maturity, and face/par/principal amount of a government coupon bond).'
seeAlso:
  - payment-time
  - bond-payment-frequency
  - face-value
alignment:
  kind: competency
  introducedByCompetency: bonds.fixed-rate-contract.interpret
  introducedInLesson: bonds.fixed-rate-contract-and-cash-flows
editorialStatus: draft
aiAssisted: true
---

The maturity time $T$ is the final scheduled payment time of the simplified
bond, measured from \term{valuation-time}.

With a regular \term{bond-payment-frequency} $m_{\mathrm B}$, the toy model has
$n=m_{\mathrm B}T$ payment periods and requires that product to be a whole
number.
