# AI provenance: inline source citations

- Date: 2026-08-31
- Model/tool: Claude Sonnet (Claude Code), single interactive session
- Prompt-template version: ad hoc repository implementation task; no reusable
  prompt template
- Registered source IDs supplied by the repository:
  `tuckman-serrat-fixed-income`, `finra-bond-yield`, and (added the previous
  day) `hull-options-futures`
- Topics affected: source-citation authoring and rendering; the eight
  foundation and bond lesson pages, whose trailing "review note" paragraphs
  now carry `\cite\{...\}` markers instead of prose-only attributions
- Files affected: `src/notation/remark-citation.mjs`,
  `src/notation/citation-format.mjs` (new); `src/components/citation/
CitationLayer.astro`, `src/components/starlight/LessonFooter.astro` (new,
  replacing `NotationFooter.astro`); `astro.config.mjs` (load source records,
  register the adapter, point the Footer slot at `LessonFooter`);
  `src/curriculum/validation.ts` and `scripts/curriculum-files.ts` (two-way
  `\cite` / `sources:` consistency check, lesson body carried into the
  catalog); `src/styles/global.css` (marker and reference-list styles); the
  eight lesson MDX files; `tests/notation/remark-citation.test.ts` and
  `tests/e2e/citations.spec.ts` (new); `docs/adr/0004-source-citations.md`
  (new); `README.md` and `docs/architecture.md` (author and pipeline notes)
- Locators cited: verified against the local `reference-library` text
  extractions of Tuckman & Serrat, _Fixed Income Securities_ (4th ed., 2022)
  and Hull, _Options, Futures, and Other Derivatives_ (8th ed., 2012), and
  against the live FINRA page fetched on 2026-08-30. Chapter, section,
  equation, table, and figure numbers were read from the source text; printed
  page numbers were not asserted and still need human confirmation.
- Quantitative outputs: none. This change is presentational; no domain code,
  golden value, or answer key was touched.
- Automated checks (Node 26.5.1): `pnpm validate:content` counted 17
  competencies, 8 lessons, 34 assessment items, 30 notation definitions, 3
  sources, 1 track; `astro check` reported 0 errors, 0 warnings, 0 hints; all
  76 Vitest tests passed; the 13-page static build completed; `pnpm test:e2e`
  passed all 65 Chromium tests, including the new citation route, hover/pin,
  and no-JavaScript specs, and the existing per-page accessibility checks.
- Human checks completed: none claimed
- Human checks pending: confirm every cited locator against the printed
  editions; reconcile the `tuckman-serrat-fixed-income` record, now set to the
  4th edition, against any lesson prose written for the 3rd; decide whether
  citation markers belong deeper in each lesson body rather than in the
  closing review note; review keyboard and screen-reader behavior of the
  marker, reference list, and hover panel

All AI-assisted material and every source record referenced here remain
`draft`. No reviewer identity or citation was invented; unconfirmed locators
are flagged in prose as pending human confirmation.
