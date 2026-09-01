---
key: accrued-interest
notation: 'AI'
title: Accrued interest
summary: Coupon amount attributed to the interval from the previous coupon date through settlement under the stated day-count convention.
domain: bonds
units: stated currency at settlement
perspective: Positive amount added to clean price to obtain the dirty invoice price in this settlement slice.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - coupon-payment
  - clean-bond-price
  - dirty-bond-price
alignment:
  kind: competency
  introducedByCompetency: bonds.clean-dirty-price.calculate
  introducedInLesson: bonds.settlement-clean-and-dirty-price
editorialStatus: draft
aiAssisted: true
---

Accrued interest is convention-dependent. The introductory calculation uses
actual days elapsed divided by actual days in the surrounding coupon period;
it does not silently stand for every market day-count rule.
