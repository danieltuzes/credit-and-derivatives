---
key: conditional-node-survival-probability
latex: 's_{i,j}'
title: Conditional node survival probability
meaning: Pricing-model probability that the issuer survives the next lattice period, conditional on being alive at the current node.
domain: bond-options
units: probability between zero and one
perspective: Risk-neutral pricing input conditional on the current alive node, not an unconditional real-world forecast.
sources:
  - hull-options-futures
seeAlso:
  - survival-probability
  - risk-neutral-probability-measure
alignment:
  kind: competency
  introducedByCompetency: bond-options.default-knockout-value.calculate
  introducedInLesson: bond-options.issuer-default-knockout
editorialStatus: draft
aiAssisted: true
---

Multiplying conditional node probabilities along a realized path gives that
path's modeled survival probability. State dependence prevents replacing all
node inputs with one unconditional number without an additional argument.
