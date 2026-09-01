---
key: lattice-state-index
latex: j
title: Lattice state-node index
meaning: Integer label for one state node within a time row of a finite recombining lattice.
domain: finance
units: dimensionless integer index
perspective: Bookkeeping label under the module's stated successor ordering, not a probability or state value.
sources:
  - hull-options-futures
seeAlso:
  - lattice-node-value
alignment:
  kind: competency
  introducedByCompetency: finance.backward-induction.calculate
  introducedInLesson: derivatives.multiperiod-lattice-valuation
editorialStatus: draft
aiAssisted: true
---

The state-node index $j$ distinguishes nodes within one lattice row. The next
row's successor indices are interpreted under the module's declared ordering.
