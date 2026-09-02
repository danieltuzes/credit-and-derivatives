---
key: signed-cash-flow
latex: 'CF_k'
meaning: 'Amount received or paid at one event from the stated holder perspective; positive means received and negative means paid by that holder.'
aliases:
  - cash flow
  - payment amount
domain: finance
units: stated currency units
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §1.4, printed pp. 55-57 and Table 1.5 (cash receipts from long bond positions and payment obligations from a short bond position in a replicating trade).'
seeAlso:
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: finance.cash-flow-perspective.apply
  introducedInLesson: foundations.cash-flow-timelines
editorialStatus: draft
aiAssisted: true
---

The signed cash flow $CF_k$ is the amount exchanged at
\term{payment-time} $t_k$, measured from one explicitly named perspective.

This playground uses positive amounts for receipts and negative amounts for
payments by the stated holder. Changing perspective reverses every sign; it
does not change the contract's dates or absolute amounts.
