---
key: lattice-time-index
latex: i
meaning: 'Integer label for one time row in a finite recombining valuation lattice; a bookkeeping label, not a model-year time or currency amount.'
domain: finance
units: dimensionless integer index
sources:
  - id: hull-options-futures
    locator: 'Ch. 12 §12.3, printed pp. 259-261, Fig. 12.3 through Fig. 12.6 (time steps and state rows in a recombining two-step tree).'
seeAlso:
  - lattice-state-index
  - lattice-node-value
alignment:
  kind: competency
  introducedByCompetency: finance.backward-induction.calculate
  introducedInLesson: derivatives.multiperiod-lattice-valuation
editorialStatus: draft
aiAssisted: true
---

The time-row index $i$ orders lattice dates. Actual model-year times and
one-period lengths remain separate inputs.
