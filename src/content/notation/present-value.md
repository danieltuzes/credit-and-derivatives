---
key: present-value
notation: 'PV_0'
title: Present value
summary: Combines dated signed cash flows into one value at valuation time.
aliases:
  - PV
domain: finance
units: stated currency at the valuation time
perspective: Uses the same holder perspective as the signed cash flows.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - signed-cash-flow
  - discount-factor
alignment:
  kind: competency
  introducedByCompetency: finance.present-value.interpret
  introducedInLesson: foundations.present-value
editorialStatus: draft
aiAssisted: true
---

Present value $PV_0$ combines dated signed cash flows into one value at
\term{valuation-time}.

For deterministic cash flows, its definition nests
\term{signed-cash-flow} and \term{discount-factor}:

$$
PV_0=\sum_{k=1}^{n}CF_kD(0,t_k).
$$

Each dated amount is discounted before the results are added.
