---
key: cds-protection-buyer-net-present-value
notation: 'PV_0^{\mathrm{buyer}}'
title: CDS protection-buyer net present value
summary: Signed protection-buyer value equal to protection-leg magnitude minus premium-leg magnitude.
aliases:
  - protection-buyer net PV
domain: cds
units: stated currency at valuation time
perspective: Positive favors the protection buyer; negative favors the protection seller in the two-leg toy model.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
seeAlso:
  - cds-premium-leg-present-value
  - cds-protection-leg-present-value
alignment:
  kind: competency
  introducedByCompetency: cds.cash-flow-legs.interpret
  introducedInLesson: cds.premium-protection-legs-and-par-spread
editorialStatus: draft
aiAssisted: true
---

The protection-buyer net present value $PV_0^{\mathrm{buyer}}$ is signed even
though both displayed leg values are positive magnitudes:

$$
PV_0^{\mathrm{buyer}}=PV_0^{\mathrm{prot}}-PV_0^{\mathrm{prem}}.
$$

This identity excludes upfront amounts, counterparty credit risk, collateral,
funding, and transaction costs.
