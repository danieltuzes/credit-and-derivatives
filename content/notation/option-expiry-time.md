---
key: option-expiry-time
latex: 'T_{\mathrm{opt}}'
meaning: "Future model time when a European option's exercise decision and payoff are determined; a contract date shared by holder and writer, distinct from a bond maturity."
domain: options
units: model-years from the stated valuation time
sources:
  - id: hull-options-futures
    locator: 'Ch. 1 §1.5, printed p. 7 (expiration or maturity date and European exercise only on that date).'
seeAlso:
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: options.european-contract.interpret
  introducedInLesson: derivatives.european-option-contracts-and-payoffs
editorialStatus: draft
aiAssisted: true
---

The option expiry $T_{\mathrm{opt}}$ is the only exercise time for a European
option. The underlying asset can continue beyond that time.
