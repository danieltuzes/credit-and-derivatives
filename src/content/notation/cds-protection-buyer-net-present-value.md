---
key: cds-protection-buyer-net-present-value
latex: 'PV_0^{\mathrm{buyer}}'
title: CDS protection-buyer net present value
meaning: 'Signed protection-buyer value equal to protection-leg magnitude minus premium-leg magnitude; positive favors the protection buyer and negative favors the protection seller in the two-leg toy model.'
aliases:
  - protection-buyer net PV
domain: cds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §§14.5-14.6, printed pp. 361-370 (contingent leg minus fee leg).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 551-554, Tables 24.1-24.4 (survival/default weighting, scheduled premium, half-period default and accrual approximation, protection present value, and equal-leg spread).'
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
