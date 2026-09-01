---
key: bond-cash-flow
latex: 'CF_k^{\mathrm{bond}}'
title: Bond cash flow
meaning: 'Promised amount paid to the bondholder on one scheduled payment date; a positive receipt for the bondholder, with default excluded in this slice.'
aliases:
  - promised bond payment
domain: bonds
units: stated currency at payment time t_k
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §§1.1-1.2, printed pp. 50-52 (scheduled coupon and principal cash flows of a coupon bond).'
seeAlso:
  - coupon-payment
  - face-value
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: bonds.fixed-cashflows.identify
  introducedInLesson: bonds.fixed-rate-contract-and-cash-flows
editorialStatus: draft
aiAssisted: true
---

The promised bond cash flow $CF_k^{\mathrm{bond}}$ is the
\term{coupon-payment} on each scheduled date plus \term{face-value} on the
final date.

For $n$ payments in the simplified model,

$$
CF_k^{\mathrm{bond}}=C+\mathbf{1}_{\{k=n\}}F.
$$

This is a promised-cash-flow description, not a default-adjusted expectation.
