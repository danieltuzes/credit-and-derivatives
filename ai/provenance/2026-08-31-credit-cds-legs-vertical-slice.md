# AI provenance: probability, credit, CDS legs, and quotation vertical slice

- Date: 2026-08-31
- Model/tool: OpenAI Codex with delegated repository-audit and implementation
  agents
- Prompt-template version: ad hoc direct repository task; no reusable prompt
  template
- Registered source IDs used for the new financial content:
  `tuckman-serrat-fixed-income`, `hull-options-futures`,
  `shreve-stochastic-calculus-finance-ii`, and
  `isda-cds-standard-model`. AI checked the cited locators against the local
  book extracts and official converter documentation; every source record and
  all assisted content remain `draft` pending independent human verification.
- Topics affected: bonds as debt claims; disjoint events, conditional
  probability, and expectation by partition; real-world versus risk-neutral
  measures; discounted expectations; default time, constant risk-neutral
  hazard and survival; deterministic recovery and loss given default; exact
  default-time CDS premium and protection legs; zero-upfront par spread;
  conventional spread/MSQ, fixed coupon, signed upfront amount, and simplified
  forward/reverse conversion
- Content affected: eight additional draft competency records, three
  additional draft assessment sets with 16 direct/transfer items, seven
  additional draft shared notation entries, three additional draft lessons,
  revisions to the existing bond/credit/CDS lessons and assessments, the
  ordered track, homepage, handbook, architecture, source locators, and
  notation entries
- Code affected: a pure exact default-time flat-hazard CDS domain module with a
  simplified quote/upfront root solver; the CDS explorer now uses that exact
  model; the earlier discrete CDS module remains as an explicit approximation
  boundary
- Numerical checks: exact exponential moments were checked against independent
  high-resolution midpoint quadrature; automated coverage checks analytic
  limits, zero hazard, component sums, leg equality at par and after upfront,
  quote/upfront round trips, sign conventions, notional scaling, survival
  identities, boundary cases, and invalid inputs. Assessment arithmetic was
  separately recomputed from the displayed factors and closed forms.
- Golden-answer review note: the new implementation and its new reference
  answers were introduced in the same AI-assisted change. Automated agreement
  is not independent human approval; a human quantitative reviewer must verify
  the formulas, fixture arithmetic, and tolerances before review status changes.
- Automated checks: content/curriculum/notation validation, Astro and TypeScript
  checks, unit/property/compiler tests, browser route and KaTeX checks, focused
  CDS interaction and boundary tests, JavaScript-disabled fallback, mobile
  containment, accessibility, legacy redirect, and static production build
- Human checks completed: none claimed
- Human checks pending: independent source-locator confirmation; contractual
  and market-convention review; independent quantitative recalculation; notation
  resolution-report review; editorial/prerequisite review; keyboard,
  screen-reader, responsive, and print inspection in supported browsers

No reviewer identity, source locator, dependency, workflow, secret, remote
script, live market access, deployment behavior, or production-pricing claim
was invented or added.
