---
key: cds-protection-leg-present-value
latex: 'PV_0^{\mathrm{prot}}'
meaning: 'Positive valuation-time magnitude of the simplified loss-given-default payment received by the protection buyer after a modeled default.'
aliases:
  - protection-leg PV magnitude
domain: cds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 368-370, Table 14.10 and Eq. 14.7; Appendix A14.2, printed p. 506, Eq. A14.6 (expected discounted value of the contingent or protection leg).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 552-553, Table 24.3 (present value of the expected protection payoff per unit notional).'
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
