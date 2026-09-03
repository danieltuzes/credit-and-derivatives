---
key: cds-notional
latex: 'N'
meaning: 'Reference currency amount that scales the simplified premium and protection legs; a positive amount, not itself a signed leg cash flow.'
aliases:
  - CDS reference notional
domain: cds
units: stated currency
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed pp. 361-362 (CDS notional amount and premium/protection cash flows scaled to that amount).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.1, printed p. 548 (notional principal and periodic CDS premium payments).'
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
