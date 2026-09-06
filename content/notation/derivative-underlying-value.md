---
key: derivative-underlying-value
latex: 'S_t'
meaning: "Value at model time t of one unit of the asset or claim named as the derivative's underlying; a positive quoted value, while a position in the underlying carries its own signed quantity."
aliases:
  - underlying price
domain: derivatives
units: stated currency per unit of underlying at model time
sources:
  - id: hull-options-futures
    locator: 'Ch. 1 §1.3, printed pp. 5-6 (underlying asset and its spot price at forward maturity), and §1.5, printed pp. 7-9 (underlying asset and stock price in options).'
seeAlso:
  - valuation-time
alignment:
  kind: competency
  introducedByCompetency: derivatives.forward-contract.interpret
  introducedInLesson: derivatives.forward-contracts-and-value
editorialStatus: draft
aiAssisted: true
---

The underlying value $S_t$ is the value at model time $t$ of one unit of the
asset or claim referenced by a derivative contract. The lesson must state the
underlying, currency, price basis, and whether it distributes income.
