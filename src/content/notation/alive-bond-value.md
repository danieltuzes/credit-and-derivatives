---
key: alive-bond-value
latex: 'B^{\mathrm{alive}}_{i,j}'
title: Alive-state bond value
meaning: 'Ex-cash-flow value of the defaultable bond at a lattice node conditional on the issuer still being alive, before the subsequent survival and default branches; scheduled cash at the node has already been paid.'
domain: bond-options
units: stated currency per bond at the node time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 7 §7.3, printed pp. 182-184, eqs. 7.7-7.8 (risk-neutral probabilities that recover market prices by expected discounted value).'
  - id: hull-options-futures
    locator: 'Ch. 23 §23.2, printed pp. 522-523 (survival and default over a period), and Ch. 28 §28.1, printed pp. 648-652 (bond values on a tree).'
seeAlso:
  - bond-price
  - survival-probability
  - recovery-rate
alignment:
  kind: competency
  introducedByCompetency: bond-options.default-knockout-value.calculate
  introducedInLesson: bond-options.issuer-default-knockout
editorialStatus: draft
aiAssisted: true
---

Alive-state conditioning keeps the bond's own recovery branch separate from
the option contract's zero payoff after a pre-exercise default.
