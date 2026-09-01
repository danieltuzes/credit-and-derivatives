---
key: hazard-rate
notation: '\lambda'
title: Constant hazard rate
summary: Constant conditional default intensity used by the lesson's simplified exponential survival model.
aliases:
  - constant default intensity
domain: credit
units: decimal intensity per model-year
perspective: A risk-neutral pricing-model input conditional on survival to the current instant, not a cumulative probability.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
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
