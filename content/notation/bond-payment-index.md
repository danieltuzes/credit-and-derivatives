---
key: bond-payment-index
latex: 'k'
meaning: 'Labels one remaining scheduled bond payment in increasing time order; it selects a payment and is not itself a time or currency amount.'
aliases:
  - coupon payment index
domain: bonds
units: dimensionless schedule index
range: '1, \dots, n'
sources: []
seeAlso:
  - number-of-bond-payments
  - bond-cash-flow
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: bonds.fixed-cashflows.identify
  introducedInLesson: bonds.fixed-rate-contract-and-cash-flows
aiAssisted: true
---

The bond payment index $k$ labels one remaining scheduled payment in increasing
time order. The [[number-of-bond-payments]] gives the final included index.

$$
k\in\{1,\ldots,n\}
$$

This index is bookkeeping. The matching [[payment-time]] gives the time
in years, and the matching [[bond-cash-flow]] gives the promised amount.
