---
key: number-of-bond-payments
latex: 'n'
meaning: 'Counts the remaining regular coupon dates including maturity; a positive integer for the simplified regular bond schedule.'
aliases:
  - remaining coupon-date count
domain: bonds
units: scheduled payment dates
sources: []
seeAlso:
  - bond-payment-index
  - bond-payment-frequency
  - maturity-time
alignment:
  kind: competency
  introducedByCompetency: bonds.fixed-rate-contract.interpret
  introducedInLesson: bonds.fixed-rate-contract-and-cash-flows
editorialStatus: draft
aiAssisted: true
---

The number of bond payments $n$ counts the remaining regular coupon dates,
including maturity.

Under the toy schedule, the count is the \term{bond-payment-frequency}
multiplied by \term{maturity-time}:

$$
n=m_{\mathrm B}T.
$$

The model requires this product to be a positive integer, so no stub period is
present.
