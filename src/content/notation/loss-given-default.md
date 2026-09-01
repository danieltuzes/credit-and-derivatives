---
key: loss-given-default
notation: '\mathrm{LGD}'
title: Loss given default fraction
summary: Fraction of an explicitly stated reference amount not recovered under a deterministic recovery convention.
aliases:
  - LGD
domain: credit
units: decimal fraction between zero and one
perspective: Loss fraction relative to the same explicitly stated reference amount used by the recovery rate.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - recovery-rate
alignment:
  kind: competency
  introducedByCompetency: credit.loss-given-default.calculate
  introducedInLesson: credit.recovery-and-risky-present-value
editorialStatus: draft
aiAssisted: true
---

The loss-given-default fraction is the complement of the
\term{recovery-rate}:

$$
\mathrm{LGD}=1-R.
$$

The fraction has meaning only after the recovery base, timing, and perspective
have been stated. The one-period credit lesson uses par as that base; the CDS
lesson uses CDS notional and pays its simplified protection amount at exact
modeled default time.
