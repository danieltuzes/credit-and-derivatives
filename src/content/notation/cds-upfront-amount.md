---
key: cds-upfront-amount
notation: 'U_0'
title: Signed CDS upfront amount
summary: Time-zero cash amount that balances protection and fixed-coupon premium value under the lesson's pricing convention.
aliases:
  - upfront fee
  - upfront payment
domain: cds
units: stated currency at valuation time
perspective: Positive means paid by the protection buyer; negative means received by the protection buyer.
sources:
  - tuckman-serrat-fixed-income
  - hull-options-futures
  - isda-cds-standard-model
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
