---
key: alive-bond-value
latex: 'B^{\mathrm{alive}}_{i,j}'
title: Alive-state bond value
meaning: Ex-cash-flow value of the defaultable bond at a lattice node conditional on the issuer still being alive.
domain: bond-options
units: stated currency per bond at the node time
perspective: Positive holder value before subsequent survival/default branches; scheduled cash at the node has already been paid.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
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
