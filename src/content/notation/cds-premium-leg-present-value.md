---
key: cds-premium-leg-present-value
latex: 'PV_0^{\mathrm{prem}}'
title: CDS premium-leg present-value magnitude
meaning: Positive valuation-time magnitude of the simplified protection buyer's premium payments.
aliases:
  - premium-leg PV magnitude
domain: cds
units: stated currency at valuation time
perspective: Positive leg magnitude; its signed contribution to protection-buyer net value is negative.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
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
times the selected \term{cds-premium-annuity}.

From the protection buyer's signed perspective, this leg is paid and therefore
enters net value with a minus sign.
