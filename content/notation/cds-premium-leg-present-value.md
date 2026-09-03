---
key: cds-premium-leg-present-value
latex: 'PV_0^{\mathrm{prem}}'
meaning: "Positive valuation-time magnitude of the simplified protection buyer's premium payments; its signed contribution to protection-buyer net value is negative."
aliases:
  - premium-leg PV magnitude
domain: cds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 368-370, Table 14.10 and Eq. 14.6; Appendix A14.2, printed p. 506, Eq. A14.5 (expected discounted value of the fee or premium leg).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 552-553, Table 24.2 and Table 24.4 (present value of scheduled and accrued premium payments).'
seeAlso:
  - cds-contract-spread
  - cds-notional
  - cds-premium-annuity
alignment:
  kind: competency
  introducedByCompetency: cds.premium-leg.calculate
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The premium-leg present value $PV_0^{\mathrm{prem}}$ is shown as a positive
magnitude. In the lesson model it equals contractual spread times notional
times the selected [[cds-premium-annuity]].

From the protection buyer's signed perspective, this leg is paid and therefore
enters net value with a minus sign.
