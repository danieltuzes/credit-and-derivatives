# AI provenance: notation-aware curriculum playground

- Date: 2026-08-28
- Model/tool: OpenAI Codex (GPT-5 family), including parallel Codex agents
- Prompt-template version: ad hoc repository implementation task; no reusable
  prompt template
- Registered source IDs supplied by the repository:
  `tuckman-serrat-fixed-income` and `finra-bond-yield`
- Topics affected: cash-flow timelines and perspective; nominal rates,
  compounding, and basis points; discount factors; present value; fixed-rate
  bond contracts and cash flows; price from discount factors; yield to
  maturity; the price-yield relationship; semantic notation authoring and
  progressive explanation UI
- Files affected: the eight lesson pages; 17 competency records; eight
  assessment sets; the foundation track; shared notation entries; notation
  registry, Markdown/KaTeX adapter, glossary, page layer, curriculum map,
  validation scripts, configuration, tests, and related editor documentation
- Quantitative outputs recalculated with deterministic repository domain code:
  semiannual discount factor `0.9151416593531596`; annual-coupon bond price
  `981.6660733357066`; semiannual-coupon bond price
  `981.4145079859479`; five-year price-yield examples
  `104.4912925031211`, `100`, `95.73489858161207`, and
  `91.68339467742211`. Existing golden values were not weakened to make the
  implementation pass.
- Automated checks: the final integrated `pnpm verify` passed on Node 24.20.0:
  content validation counted 17 competencies, 8 lessons, 34 assessment items,
  30 notation definitions, 2 sources, and 1 track; Astro reported no
  diagnostics; all 43 Vitest tests passed; and the 13-page static build
  completed. `pnpm test:e2e` passed all 16 Chromium tests, including full-page
  automated accessibility checks for every lesson, notation interaction,
  no-JavaScript fallback, transitive bundle rendering, and the bond lab.
- Human checks completed: none claimed
- Human checks pending: verify every source and exact locator; independently
  recalculate formulas and all 34 answer keys; review financial conventions,
  units, signs, dates, terminology, pedagogy, glossary dependency direction,
  keyboard/screen-reader behavior, and the two numerical answer-key updates

All AI-assisted educational material remains `draft`. Unsupported or
unlocated claims are marked `NEEDS_SOURCE`; no reviewer identity or citation
was invented.
