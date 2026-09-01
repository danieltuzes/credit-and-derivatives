---
key: conditional-node-survival-probability
latex: 's_{i,j}'
title: Conditional node survival probability
meaning: 'Pricing-model probability that the issuer survives the next lattice period, conditional on being alive at the current node; a risk-neutral input, not an unconditional real-world forecast.'
domain: bond-options
units: probability between zero and one
sources:
  - id: hull-options-futures
    locator: 'Ch. 23 §23.2, printed pp. 522-523 (default intensity and conditional survival over a short interval).'
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
