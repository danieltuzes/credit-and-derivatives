---
key: put-option-value
latex: 'p_t'
title: European put value
meaning: 'Current non-negative value to the holder of a European put under the stated model, before any financing or transaction costs.'
domain: options
units: stated currency at model time t
sources:
  - id: hull-options-futures
    locator: 'Ch. 1 §1.5, printed pp. 7-9 (put option and holder rights), and Ch. 9, printed pp. 211-212 (value versus payoff and profit).'
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

The put value $p_t$ is the current value of the right, but not the obligation,
to sell the underlying at the strike at European expiry.
