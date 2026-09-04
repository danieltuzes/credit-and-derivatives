---
key: cds-upfront-amount
latex: 'U_0'
meaning: "Time-zero cash amount that balances protection and fixed-coupon premium value under the lesson's pricing convention; positive means paid by the protection buyer and negative means received by the protection buyer."
aliases:
  - upfront fee
  - upfront payment
domain: cds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 366-370 and Table 14.10 (market-determined upfront amount balancing a standardized coupon against the CDS spread); Appendix A14.2, printed p. 506, Eq. A14.7 (upfront-amount formula).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.4, printed p. 557 (up-front amount 100-P and its protection-buyer payment sign).'
  - id: isda-cds-standard-model
    locator: 'ISDA Standard CDS Contract Converter Specification (version May 5, 2009), Specification, printed pp. 3-4 (upfront definition, buyer/seller cash-settlement sign, and spread/upfront conversion after solving the constant hazard rate).'
seeAlso:
  - cds-market-standard-quote
  - cds-standard-coupon
  - cds-protection-buyer-net-present-value
alignment:
  kind: competency
  introducedByCompetency: cds.upfront-amount.calculate
  introducedInLesson: cds.market-standard-quote-and-upfront
editorialStatus: draft
aiAssisted: true
---

The signed upfront amount $U_0$ is exchanged at valuation time in this
lesson's simplified conversion. A positive amount is paid by the protection
buyer and a negative amount is received by that buyer.

It equals protection-leg present value minus fixed-coupon premium-leg present
value under the same calibrated model inputs. Subtracting that signed amount
from the buyer's pre-upfront value makes inception value zero.
