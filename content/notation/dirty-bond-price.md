---
key: dirty-bond-price
latex: 'P^{\mathrm{dirty}}'
meaning: 'Full cash or invoice price paid for the bond, equal to clean price plus accrued interest; a positive cash price paid by the buyer under the stated settlement convention.'
aliases:
  - full price
  - cash bond price
  - invoice price
domain: bonds
units: stated currency at settlement
sources:
  - id: tuckman-serrat-fixed-income
    locator: 'Ch. 1 §1.6, printed pp. 60-61 and Eq. 1.5 (flat or clean price and full or dirty price equal to clean price plus accrued interest).'
  - id: hull-options-futures
    locator: 'Ch. 28 §28.1, printed p. 650, Eq. 28.3 (cash or dirty bond price and quoted or clean bond price plus accrued interest).'
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
