---
key: knockout-bond-option-value
latex: 'O^{\mathrm{KO}}_{i,j}'
title: Issuer-default knockout bond option value
meaning: 'Alive-node value of a European bond option that is extinguished with zero option rebate by issuer default before exercise; a non-negative holder value conditional on the issuer being alive at the node.'
domain: bond-options
units: stated currency per option at the node time
sources:
  - id: hull-options-futures
    locator: 'Ch. 24 §24.5, printed pp. 557-558 (CDS-linked contracts that cease on pre-maturity reference-entity default), and Ch. 28 §28.1, printed pp. 648-652 (European bond options).'
seeAlso:
  - alive-bond-value
  - conditional-node-survival-probability
  - option-strike-price
alignment:
  kind: competency
  introducedByCompetency: bond-options.default-knockout-value.calculate
  introducedInLesson: bond-options.issuer-default-knockout
editorialStatus: draft
aiAssisted: true
---

The superscript identifies this lesson's contractual default trigger. It is
not a market-price barrier option and carries no default rebate.
