---
key: lattice-state-index
latex: j
meaning: 'Integer label for one state node within a time row of a finite recombining lattice; a bookkeeping label under the stated successor ordering, not a probability or state value.'
domain: finance
units: dimensionless integer index
sources:
  - id: hull-options-futures
    locator: 'Ch. 12 §12.3, printed pp. 259-261, Fig. 12.3 through Fig. 12.6 (state nodes and successor labeling in a recombining two-step tree).'
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
