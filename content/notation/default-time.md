---
key: default-time
latex: '\tau'
meaning: 'Random model time at which the reference entity first defaults. It is measured in model-years from valuation time under the stated risk-neutral model.'
formula: '\tau > 0'
domain: credit
units: model-years after valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Appendix A14.1, printed p. 505, Eqs. A14.1-A14.4 (constant-hazard survival and cumulative default probabilities over time).'
  - id: hull-options-futures
    locator: 'Ch. 24 §§24.1-24.2, printed pp. 548-552 (default timing relative to scheduled premium dates and modeled default times within payment periods).'
seeAlso:
  - valuation-time
  - hazard-rate
  - survival-probability
alignment:
  kind: competency
  introducedByCompetency: credit.hazard-rate.interpret
  introducedInLesson: credit.default-hazard-and-survival
aiAssisted: true
---

The default time $\tau$ is random. The credit lessons state every survival and
default probability as the probability of an event about $\tau$, and the CDS
lessons place each premium and protection payment by where $\tau$ falls in the
schedule.
