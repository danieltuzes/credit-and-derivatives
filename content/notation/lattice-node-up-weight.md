---
key: lattice-node-up-weight
latex: 'q_{i,j}'
meaning: 'Pricing probability assigned to the up successor, conditional on the current node; in a lattice with issuer default, also conditional on survival to the next lattice time.'
domain: finance
units: probability between zero and one
sources:
  - id: hull-options-futures
    locator: 'Ch. 12 §12.3, printed pp. 259-261, Eq. 12.6 and Eqs. 12.7-12.10 (risk-neutral up weight in backward induction).'
seeAlso:
  - risk-neutral-probability-measure
  - lattice-node-discount-factor
alignment:
  kind: competency
  introducedByCompetency: finance.backward-induction.calculate
  introducedInLesson: derivatives.multiperiod-lattice-valuation
aiAssisted: true
---

The down successor receives the complementary weight $1-\explain{lattice-node-up-weight}{q_{i,j}}$. The weight
is a pricing probability of the lattice, not a forecast of the next state.
