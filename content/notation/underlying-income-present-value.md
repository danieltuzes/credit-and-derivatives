---
key: underlying-income-present-value
latex: 'I_0'
meaning: 'Valuation-time value of deterministic cash income paid by the underlying after valuation and before the contract horizon, forward delivery or the matched option expiry. It is subtracted from spot value because the forward or option position does not receive that income.'
domain: derivatives
units: stated currency at valuation time per unit of underlying
sources:
  - id: hull-options-futures
    locator: 'Ch. 5 §5.5, printed pp. 107-108, Eq. 5.2 (present value I of known pre-delivery income), §5.7, printed p. 111, Eq. 5.6 (known-income forward value), and Ch. 10 §10.7, printed pp. 229-230, Eq. 10.10 (present value of dividends in European put-call parity).'
seeAlso:
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: derivatives.forward-delivery-price.calculate
  introducedInLesson: derivatives.forward-contracts-and-value
aiAssisted: true
---

Only income paid before the horizon enters $I_0$; income paid later belongs to
whoever holds the underlying then.
