---
key: cds-protection-buyer-net-present-value
latex: 'PV_0^{\mathrm{buyer}}'
meaning: 'Signed protection-buyer value equal to protection-leg magnitude minus premium-leg magnitude; positive favors the protection buyer and negative favors the protection seller in the two-leg toy model.'
aliases:
  - protection-buyer net PV
domain: cds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 369-370, Table 14.10 and Eqs. 14.6-14.7 (fee- and contingent-leg values and the upfront amount balancing their difference).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.2, printed pp. 552-554, Tables 24.2-24.4 (premium and protection present values and the buyer/seller mark-to-market sign).'
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
