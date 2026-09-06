---
key: put-option-value
latex: 'p_t'
label: 'European put value'
meaning: 'Current non-negative value to the holder of a European put under the stated model, before any financing or transaction costs.'
domain: options
units: stated currency at model time
sources:
  - id: hull-options-futures
    locator: 'Ch. 1 §1.5, printed pp. 7-9 (put holder right and option purchase price), and Ch. 9 §9.1, printed pp. 194-196 (European put option price and holder value/profit example).'
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
