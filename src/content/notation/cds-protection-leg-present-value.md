---
key: cds-protection-leg-present-value
latex: 'PV_0^{\mathrm{prot}}'
title: CDS protection-leg present-value magnitude
meaning: 'Positive valuation-time magnitude of the simplified loss-given-default payment received by the protection buyer after a modeled default.'
aliases:
  - protection-leg PV magnitude
domain: cds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.5, printed pp. 361-366, eqs. 14.4-14.7 (contingent/protection leg present value).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 551-554, Tables 24.1-24.4 (survival/default weighting, scheduled premium, half-period default and accrual approximation, protection present value, and equal-leg spread).'
seeAlso:
  - cds-notional
  - loss-given-default
  - interval-default-probability
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: cds.protection-leg.calculate
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The protection-leg present value $PV_0^{\mathrm{prot}}$ is a positive magnitude
received by the protection buyer in the lesson's one-default model. The
simplified payoff is loss-given-default times notional. Each interval
contribution integrates the risk-neutral default density and discounts from
the modeled default time inside that interval.

This draft does not specify actual contractual settlement, auction mechanics,
deliverables, or payment delays.
