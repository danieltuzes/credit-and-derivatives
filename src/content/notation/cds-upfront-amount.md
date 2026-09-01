---
key: cds-upfront-amount
latex: 'U_0'
title: Signed CDS upfront amount
meaning: "Time-zero cash amount that balances protection and fixed-coupon premium value under the lesson's pricing convention; positive means paid by the protection buyer and negative means received by the protection buyer."
aliases:
  - upfront fee
  - upfront payment
domain: cds
units: stated currency at valuation time
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 14 §14.6, printed pp. 366-370, Tables 14.9-14.10 and eqs. 14.4-14.7 (event-weighted leg present values, fair-spread equality, standardized coupons, and spread/upfront conversion).'
  - id: hull-options-futures
    locator: 'Ch. 24 §24.4, printed pp. 556-557 (fixed coupon, implied hazard, and upfront price from a quoted spread).'
  - id: isda-cds-standard-model
    locator: 'ISDA Standard CDS Contract Converter Specification (version May 5, 2009), Functionality and Specification, printed p. 1 (standardized conversion between spread and upfront using a standard coupon, recovery rate, and discount inputs).'
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
