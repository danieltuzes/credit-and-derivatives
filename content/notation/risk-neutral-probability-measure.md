---
key: risk-neutral-probability-measure
latex: '\mathbb{Q}'
meaning: 'Supplies model pricing weights under which discounted traded prices satisfy the martingale condition; it prices payoffs relative to a stated numeraire and is not a forecast of actual event frequencies.'
aliases:
  - equivalent martingale measure
  - pricing measure
domain: finance
units: dimensionless probability weights between zero and one
sources:
  - id: shreve-stochastic-calculus-finance-ii
    locator: 'Ch. 5 §5.2.2, printed pp. 216-217, Eqs. 5.2.22-5.2.24 (the risk-neutral measure makes the discounted stock price a martingale and changes drift but not volatility).'
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 7 §7.3, printed pp. 182-184, eqs. 7.7-7.8 (risk-neutral probabilities that recover market prices by expected discounted value).'
  - id: hull-options-futures
    locator: 'Ch. 27 §§27.3-27.4, printed pp. 635-637, Eqs. 27.14-27.20 (equivalent martingale measures, numeraires, and the traditional risk-neutral measure).'
seeAlso:
  - real-world-probability-measure
  - expectation
alignment:
  kind: competency
  introducedByCompetency: finance.risk-neutral-measure.interpret
  introducedInLesson: foundations.risk-neutral-pricing
editorialStatus: draft
aiAssisted: true
---

The risk-neutral probability measure $\mathbb{Q}$ supplies the scenario weights
used by the stated no-arbitrage pricing model. It is equivalent to the
real-world measure $\mathbb{P}$ — the two agree on which outcomes are
possible — but assigns those outcomes different weights.

**What holds under $\mathbb{Q}$.** Relative to the chosen numeraire (here the
cash account), every discounted traded price is a $\mathbb{Q}$-martingale: its
value today equals the $\mathbb{Q}$-weighted [[expectation]] of its discounted
future value. A claim's time-zero price is therefore the [[expectation]], taken
under $\mathbb{Q}$, of its discounted payoff; when the discount factor is
deterministic it factors out of that expectation. The superscript in
$\mathbb{E}^{\mathbb{Q}}$ records that the weights are $\mathbb{Q}$'s.

Changing from $\mathbb{P}$ to $\mathbb{Q}$ reweights the modeled outcomes; it
does not change the payoff in any scenario. The name does not mean that
outcomes are risk-free, that volatility vanishes, or that all investors are
indifferent to risk.
