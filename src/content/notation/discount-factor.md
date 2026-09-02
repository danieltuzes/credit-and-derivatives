---
key: discount-factor
latex: 'D(0,t)'
meaning: Converts one deterministic future unit into value at valuation time.
aliases:
  - present-value factor
domain: rates
units: current currency-units per future currency-unit
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §1.2, printed pp. 51-52, Eqs. 1.1-1.3 (d(t) as the value today of one currency unit received in t years and its use in bond present value).'
seeAlso:
  - accumulation-factor
  - valuation-time
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: rates.discount-factor.interpret
  introducedInLesson: foundations.discount-factors
editorialStatus: draft
aiAssisted: true
---

The discount factor $D(0,t)$ is the value at \term{valuation-time} of one
deterministic unit paid at future time $t$ under the stated model.

It is the reciprocal of the \term{accumulation-factor}:

$$
D(0,t)=\frac{1}{A(0,t)}=(1+r_m)^{-mt}.
$$

It is neither an interest-rate quote nor a probability of payment.
