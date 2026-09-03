---
key: lattice-node-value
latex: 'V_{i,j}'
meaning: 'Claim value at time row i and state node j obtained by one-period backward induction from its successor nodes, conditional on reaching that node under the supplied pricing lattice.'
domain: finance
units: stated currency at the node time
sources:
  - id: hull-options-futures
    locator: 'Ch. 12 §12.3, printed pp. 259-261, Eqs. 12.5 and 12.7-12.10 (node-by-node backward induction from successor values).'
seeAlso:
  - risk-neutral-expectation
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: finance.backward-induction.calculate
  introducedInLesson: derivatives.multiperiod-lattice-valuation
editorialStatus: draft
aiAssisted: true
---

A lattice node value is conditional on the node's modeled state. The indices
are labels, not currency amounts or probabilities.
