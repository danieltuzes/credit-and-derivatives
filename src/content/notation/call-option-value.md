---
key: call-option-value
latex: 'c_t'
title: European call value
meaning: 'Current non-negative value to the holder of a European call under the stated model, before any financing or transaction costs.'
domain: options
units: stated currency at model time t
sources:
  - id: hull-options-futures
    locator: 'Ch. 1 §1.5, printed pp. 7-9 (call option and holder rights), and Ch. 9, printed pp. 211-212 (value versus payoff and profit).'
seeAlso:
  - option-strike-price
  - option-expiry-time
alignment:
  kind: competency
  introducedByCompetency: options.value-payoff-profit.distinguish
  introducedInLesson: derivatives.european-option-contracts-and-payoffs
editorialStatus: draft
aiAssisted: true
---

The call value $c_t$ is the current value of the right, but not the obligation,
to buy the underlying at the strike at European expiry.
