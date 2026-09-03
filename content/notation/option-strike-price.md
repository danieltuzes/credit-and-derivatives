---
key: option-strike-price
latex: 'K'
meaning: "Contractual price per unit of underlying used to determine the option's exercise payoff; a positive contractual amount, with payoff signs depending on call or put and holder or writer perspective."
aliases:
  - exercise price
domain: options
units: expiry-time currency per unit of underlying
sources:
  - id: hull-options-futures
    locator: 'Ch. 1 §1.5, printed p. 7 (exercise or strike price as the contractual option price).'
seeAlso:
  - option-expiry-time
  - derivative-underlying-value
alignment:
  kind: competency
  introducedByCompetency: options.european-contract.interpret
  introducedInLesson: derivatives.european-option-contracts-and-payoffs
editorialStatus: draft
aiAssisted: true
---

The option strike $K$ is the contractual price used in the call or put payoff
at expiry. It is fixed by the contract and is not the option premium.
