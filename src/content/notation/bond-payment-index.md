---
key: bond-payment-index
latex: 'k'
title: Bond payment index
meaning: 'Labels one remaining scheduled bond payment in increasing time order; it selects a payment and is not itself a time or currency amount.'
aliases:
  - coupon payment index
domain: bonds
units: dimensionless schedule index
sources: []
seeAlso:
  - number-of-bond-payments
  - bond-cash-flow
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: bonds.fixed-cashflows.identify
  introducedInLesson: bonds.fixed-rate-contract-and-cash-flows
editorialStatus: draft
aiAssisted: true
---

The bond payment index $k$ labels one remaining scheduled payment in increasing
time order. The \term{number-of-bond-payments} gives the final included index.

$$
k\in\{1,\ldots,n\}.
$$

This index is bookkeeping. The matching \term{payment-time} supplies the time
in years, and the matching \term{bond-cash-flow} supplies the promised amount.
