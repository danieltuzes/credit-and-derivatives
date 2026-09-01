---
key: lattice-node-value
latex: 'V_{i,j}'
title: Lattice node value
meaning: 'Claim value at time row i and state node j obtained by one-period backward induction from its successor nodes, conditional on reaching that node under the supplied pricing lattice.'
domain: finance
units: stated currency at the node time
sources:
  - id: hull-options-futures
    locator: 'Ch. 12 §§12.1-12.3, printed pp. 253-261 (one- and two-step binomial replication, risk-neutral weights, discounted expected payoff, and backward induction).'
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
