---
key: put-option-value
latex: 'p_t'
title: European put value
meaning: Current non-negative value to the holder of a European put under the stated model.
domain: options
units: stated currency at model time t
perspective: Holder value before subtracting any financing or transaction costs.
sources:
  - hull-options-futures
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
