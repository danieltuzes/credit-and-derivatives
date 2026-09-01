---
key: cds-protection-leg-present-value
notation: 'PV_0^{\mathrm{prot}}'
title: CDS protection-leg present-value magnitude
summary: Positive valuation-time magnitude of the simplified loss-given-default payment received by the protection buyer.
aliases:
  - protection-leg PV magnitude
domain: cds
units: stated currency at valuation time
perspective: Positive leg magnitude received by the protection buyer after a modeled default.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
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
