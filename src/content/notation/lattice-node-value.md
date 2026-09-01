---
key: lattice-node-value
latex: 'V_{i,j}'
title: Lattice node value
meaning: Claim value at time row i and state node j obtained by one-period backward induction from its successor nodes.
domain: finance
units: stated currency at the node time
perspective: Holder value conditional on reaching the named node under the supplied pricing lattice.
sources:
  - hull-options-futures
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
