---
key: cds-notional
notation: 'N'
title: CDS notional
summary: Reference currency amount that scales the simplified premium and protection legs.
aliases:
  - CDS reference notional
domain: cds
units: stated currency
perspective: Positive reference amount; it is not itself a signed leg cash flow.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
seeAlso: []
alignment:
  kind: competency
  introducedByCompetency: cds.cash-flow-legs.interpret
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The CDS notional $N$ is the positive reference currency amount used by the
simplified lesson formulas. Premium and protection-leg magnitudes scale
linearly with it.

This draft does not assert a settlement mechanism or that the notional itself
is exchanged.
