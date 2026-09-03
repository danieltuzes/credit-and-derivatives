---
key: loss-given-default
latex: '\mathrm{LGD}'
meaning: 'Fraction of an explicitly stated reference amount not recovered under a deterministic recovery convention, relative to the same reference amount used by the recovery rate.'
aliases:
  - LGD
domain: credit
units: decimal fraction between zero and one
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.2, printed p. 353 (loss as one minus the recovery fraction of face amount); Appendix A14.2, printed p. 506, Eq. A14.6 (CDS contingent-leg amount scaled by one minus recovery).'
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
[[recovery-rate]]:

$$
\mathrm{LGD}=1-R.
$$

The fraction has meaning only after the recovery base, timing, and perspective
have been stated. The one-period credit lesson uses par as that base; the CDS
lesson uses CDS notional and pays its simplified protection amount at exact
modeled default time.
