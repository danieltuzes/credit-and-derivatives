---
key: alive-bond-value
latex: 'B^{\mathrm{alive}}_{i,j}'
label: 'Alive-state bond value'
meaning: 'Ex-cash-flow value of the defaultable bond at a lattice node conditional on the issuer still being alive, before the subsequent survival and default branches; scheduled cash at the node has already been paid.'
domain: bond-options
units: stated currency per bond at the node time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 7 §7.3, printed pp. 182-184, Eqs. 7.7-7.8 (risk-neutral expected-discounted valuation of contingent claims); Ch. 14 §14.7, printed pp. 371-372, Table 14.11 and Eqs. 14.8-14.10 (a defaultable bond valued from default- and survival-contingent cash flows).'
  - id: hull-options-futures
    locator: 'Ch. 12 §12.3, printed pp. 259-261, Eqs. 12.5 and 12.7-12.10 (node-by-node backward induction), and Ch. 23 §§23.2-23.4, printed pp. 522-525 (survival, default, and defaultable-bond cash-flow valuation).'
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
