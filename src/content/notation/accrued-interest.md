---
key: accrued-interest
latex: 'AI'
title: Accrued interest
meaning: 'Coupon amount attributed to the interval from the previous coupon date through settlement under the stated day-count convention; a positive amount added to the clean price to obtain the dirty invoice price.'
domain: bonds
units: stated currency at settlement
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §1.6, printed pp. 60-62 (actual/actual accrued interest; flat/clean price plus accrued equals the full/dirty invoice price).'
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
