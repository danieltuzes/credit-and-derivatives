---
key: option-expiry-time
latex: 'T_{\mathrm{opt}}'
title: Option expiry time
meaning: Future model time when a European option's exercise decision and payoff are determined.
domain: options
units: model-years from the stated valuation time
perspective: Contract date shared by holder and writer; it is distinct from a bond maturity.
sources:
  - hull-options-futures
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
