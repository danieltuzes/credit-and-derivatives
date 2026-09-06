---
key: expectation
latex: '\mathbb{E}'
formula: '\mathbb{E}[X]=\int_{\Omega} X(\omega)\,d\mathbb{P}(\omega)'
glosses:
  - latex: 'X'
    name: 'random variable'
  - latex: '\Omega'
    name: 'sample space'
  - latex: '\omega'
    name: 'outcome'
  - latex: '\mathbb{P}'
    name: 'probability measure'
    units: 'dimensionless probability weights between zero and one'
meaning: 'Operator returning the average of a random quantity, each outcome weighted by its probability under a stated measure; a superscript names that measure when more than one is in play.'
aliases:
  - expected value
  - expectation operator
domain: probability
units: value units
sources:
  - id: shreve-stochastic-calculus-finance-ii
    locator: 'Ch. 1 §1.3, printed pp. 13-18, Def. 1.3.1 and Thm. 1.3.4 (expectation as the integral of a random variable against its probability measure, with the finite-valued probability-weighted sum as the special case); Ch. 1 §1.3, printed p. 27, Thm. 1.3.7 (linearity, order, and Jensen).'
  - id: hull-options-futures
    locator: 'Ch. 14 §14.7, printed pp. 311-313 (valuation as an expected payoff taken under a stated set of probabilities).'
seeAlso:
  - terminal-random-payoff
alignment:
  kind: competency
  introducedByCompetency: probability.expectation-by-partition.calculate
  introducedInLesson: foundations.probability-events-and-expectation
editorialStatus: draft
aiAssisted: true
---

The rigorous definition is the formula shown for this entry: the expectation of
an integrable random variable is its integral against the probability measure
of the model's outcome space, taken over the whole sample space.

When the outcomes form a finite partition and the random value is constant on
each event, that integral collapses to the familiar weighted sum — each value
times its probability, added over the events — which is how the early lessons
in this course compute it.

The operator is linear, is order-preserving, returns a constant unchanged, and
obeys the tower property under iterated conditioning. Its result carries the
units of the quantity being averaged; discounting, when needed, is a separate
step.

A superscript on the operator names the measure when the choice matters — a
"Q" for the risk-neutral measure, a "P" for the real-world one.
