# AI provenance: KaTeX, layout, and compact-example hardening

- Date: 2026-08-30
- Model/tool: OpenAI Codex
- Prompt-template version: ad hoc direct repository task; no reusable prompt
  template
- Registered source IDs supplied: none; this change uses repository-local
  content and policies and adds no financial or contractual claims
- Repository context reviewed: `README.md`, `CONTENT_STANDARD.md`,
  `AI_POLICY.md`, `docs/architecture.md`, the accepted notation ADRs, the
  notation compiler and UI, the eight draft lessons, and their browser and
  compiler tests
- Files/topics affected: notation binding and KaTeX failure handling; notation
  panel positioning; desktop navigation and contents edge controls with hover
  previews; compact worked examples in all eight draft lessons; editor
  instructions; compiler, browser, accessibility, progressive-enhancement,
  responsive-layout, and print tests
- Content changes: no example prose, formula, input, result, convention, source,
  competency, or assessment answer was intentionally changed; example headings
  became descriptive tab labels and the existing price-yield lab moved outside
  its disclosure
- Independent recalculation: not applicable to the UI and compiler changes;
  existing numerical reference, invariant, property, and curriculum tests remain
  the independent guards for the unchanged lesson calculations
- Automated checks: `pnpm verify`, including content validation, Astro/TypeScript
  checks, unit and property tests, a freshly started Astro server under
  Playwright, per-lesson KaTeX-error scanning, accessibility checks, UI
  interaction tests, and a production build
- Human checks completed: none claimed
- Human checks pending: quantitative review of the changed semantic-binding
  spans and resolution output; editorial review of the collapsed-example
  presentation; keyboard, screen-reader, print, and responsive-layout review in
  supported browsers; and confirmation that persisted sidebar preferences fit
  the intended reader experience

No source citation, reviewer identity, hidden reasoning, credential, private
data, licensed material, dependency, workflow, remote script, or live-market
access was added.
