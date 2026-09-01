---
key: cds-notional
latex: 'N'
title: CDS notional
meaning: 'Reference currency amount that scales the simplified premium and protection legs; a positive amount, not itself a signed leg cash flow.'
aliases:
  - CDS reference notional
domain: cds
units: stated currency
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed pp. 361-366 (CDS contract, fee and contingent legs, quarterly premium, and default accrual).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.1, printed pp. 548-550 (CDS definition, quarterly premium, protection settlement, and accrued premium after a mid-period default).'
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
