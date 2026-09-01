---
key: hazard-rate
latex: '\lambda'
title: Constant hazard rate
meaning: "Constant conditional default intensity used by the lesson's simplified exponential survival model; a risk-neutral pricing input conditional on survival to the current instant, not a cumulative probability."
aliases:
  - constant default intensity
domain: credit
units: decimal intensity per model-year
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.7, printed p. 371, and Appendix A14.1, printed pp. 505-506 (constant hazard in the exponential survival model).'
  - id: hull-options-futures
    locator: 'Ch. 23 §23.2, printed pp. 522-523 (default intensity/hazard rate and survival probability).'
seeAlso:
  - survival-probability
alignment:
  kind: competency
  introducedByCompetency: credit.hazard-rate.interpret
  introducedInLesson: credit.default-hazard-and-survival
editorialStatus: draft
aiAssisted: true
---

The constant hazard rate $\lambda$ is the simplified model's conditional
default intensity per model-year under the explicitly stated probability
measure. The credit and CDS lessons use a risk-neutral pricing measure. It is
not a cumulative default probability and is not an interest rate.

In the lesson's constant-hazard model, \term{survival-probability} is
$S(0,t)=\exp(-\lambda t)$.
