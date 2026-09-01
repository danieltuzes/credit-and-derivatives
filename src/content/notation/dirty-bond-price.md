---
key: dirty-bond-price
latex: 'P^{\mathrm{dirty}}'
title: Dirty bond price
meaning: 'Full cash or invoice price paid for the bond, equal to clean price plus accrued interest; a positive cash price paid by the buyer under the stated settlement convention.'
aliases:
  - full price
  - cash bond price
  - invoice price
domain: bonds
units: stated currency at settlement
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §1.6, printed pp. 60-62 (actual/actual accrued interest; flat/clean price plus accrued equals the full/dirty invoice price).'
  - id: hull-options-futures
    locator: 'Ch. 28 §28.1, printed pp. 648-652 (clean/dirty strike treatment in bond options).'
seeAlso:
  - bond-price
  - clean-bond-price
  - accrued-interest
alignment:
  kind: competency
  introducedByCompetency: bonds.clean-dirty-price.calculate
  introducedInLesson: bonds.settlement-clean-and-dirty-price
editorialStatus: draft
aiAssisted: true
---

The dirty price is the price basis used for cash settlement and present value
in this slice. On a coupon date with zero accrued interest it coincides with
the earlier simplified bond-price definition.
