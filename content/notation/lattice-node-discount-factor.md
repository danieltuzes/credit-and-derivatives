---
key: lattice-node-discount-factor
latex: 'd_{i,j}'
meaning: 'One-period discount factor at a lattice node: currency at the node per one unit of currency at either successor node one step later.'
domain: finance
units: current-node currency per next-time currency
sources:
  - id: hull-options-futures
    locator: 'Ch. 12 §12.3, printed pp. 259-261, Eq. 12.5 and Eqs. 12.7-12.10 (one-step discounting in backward induction).'
seeAlso:
  - lattice-node-up-weight
  - lattice-time-index
  - lattice-state-index
alignment:
  kind: competency
  introducedByCompetency: finance.backward-induction.calculate
  introducedInLesson: derivatives.multiperiod-lattice-valuation
editorialStatus: draft
aiAssisted: true
---

Backward induction multiplies the local expectation of the successor values by
$\explain{lattice-node-discount-factor}{d_{i,j}}$. In a lattice with issuer default, the same factor discounts from an
alive node to the next lattice time.
