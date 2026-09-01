# claude_rebuild_plan.md — step-by-step rebuild into a leaner shape

Companion to `claude_architecture.md`. A dependency-ordered sequence that turns
the current organically-grown repo into one with a single content pipeline, a
single reference-resolution mechanism, a single UI panel primitive, one
consolidated doc set, and a test gate on every feature.

---

## How to use this

**Two modes, one sequence:**

- **Mode A — fresh repo.** Run the steps as written in a new directory. Port
  content by copying files (they are already valid data).
- **Mode B — in-place refactor** _(recommended)_. Same steps, same order, on the
  current repo. Each step's **In-place note** says what to delete/replace
  instead of create. Do it on a branch.

**Rules for every step:**

1. One step = one focused prompt to an agent (or one work session) + one green
   gate. Do **not** begin step N+1 until step N's gate passes.
2. **Content is ported as data, never regenerated.** Competency graphs,
   assessment answer keys, notation entries, and reviewed lesson numbers are the
   asset. Prose is _reviewed_, not rewritten. Any change to a golden value is a
   flagged human-review item, never a silent edit.
3. Every ported lesson re-enters at `editorialStatus: draft` until a human
   re-confirms it against this pipeline (per `AI_POLICY.md`).
4. Write the provenance record (`ai/provenance/`) for each phase that touches
   content or calculations.

---

## Goals this rebuild locks in

| Goal                                 | Mechanism                                                                                                         | Enforced in |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| Token-efficient context              | One `claude_architecture.md` + short `README.md` + `AGENTS.md` + `AI_POLICY.md`; ADRs only for irreversible calls | Phase 8     |
| One content pipeline                 | `getCollection()` is the _only_ content reader; validator and build consume the same shapes                       | Phase 2, 4  |
| One reference mechanism              | `\term` / `\explain` / `\cite` share a resolver + a hover-panel primitive                                         | Phase 5, 6  |
| AI can prove "everything is defined" | Completeness gate returns `file:line` + token; resolution report is a checked artifact                            | Phase 6     |
| End user sees "what is what"         | Static disclosure + glossary + numbered references, all no-JS                                                     | Phase 5, 6  |
| Human edits content easily           | Frontmatter + Markdown only; schemas give one clear error each                                                    | Phase 2     |
| Every feature (incl. UI) tested      | Each phase gate includes the relevant unit/e2e/axe spec                                                           | all phases  |

---

## Phase 0 — decisions before any code (human)

These change what later phases build. Answer them first.

| Decision                    | Options                                                                                                                                                                                                                                                                                               | Recommendation                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D-a Scope**               | Fresh repo (Mode A) vs in-place refactor (Mode B)                                                                                                                                                                                                                                                     | **Mode B.** The content and domain code are sound; only the toolchain and docs are overweight.                                                                                                              |
| **D-b ADR 0003**            | (i) Build the full inline-binding slice (`\def`/`\let`/`\group`/`:::equation`, base library, resolution report, overlay, mute list); (ii) Build only the parts with proven need (base library + resolution report); (iii) Cut it — delete all forward-references, keep today's frontmatter-only model | **(ii).** The base notation library and the resolution report earn their weight for AI review; inline macros, the overlay, and the mute list do not yet have a lesson that needs them.                      |
| **D-c Notation + citation** | Two parallel subsystems vs one "resolved reference" core with two front-ends                                                                                                                                                                                                                          | **One core.** Shared loader, shared resolver, shared hover-panel primitive; `\term`/`\explain`/`\cite` are thin adapters.                                                                                   |
| **D-d Progress**            | Leave as a bare seam vs implement the local-storage adapter now                                                                                                                                                                                                                                       | Implement the **interface + local adapter** in Phase 7 so the assessment renderer and any future mute list have a real seam, not a promise.                                                                 |
| **D-e Owner items**         | —                                                                                                                                                                                                                                                                                                     | Choose code + content licenses; real `CODEOWNERS` + branch protection; static host + its deploy permissions; how reviewer identity/date is stored. Blocks public contributions and deploy, not the rebuild. |

Record the answers at the top of `claude_architecture.md` before proceeding.

---

## Phase 1 — skeleton

**Goal.** A buildable empty Starlight site with the full verify pipeline and CI
wired, dependencies pinned.

**Prompt.** "Create an Astro + Starlight + React + TypeScript project. Pin every
dependency to an exact version (copy versions from the current `package.json`).
Add `pnpm` scripts `dev`, `build`, `preview`, `check`, `validate:content`
(stub), `test`, `test:watch`, `test:e2e`, `format`, `format:check`, and
`verify` = `format:check && validate:content && check && test && test:e2e &&
astro build`. Add `.nvmrc`/`.node-version` (Node 24), `prettier.config.mjs`,
`.editorconfig`, `tsconfig.json`, `.gitignore`, and a single CI job that runs
`pnpm verify` with `contents: read` permissions and a frozen lockfile."

**Gate.** `pnpm build` succeeds on the empty site; `pnpm format:check` clean.

**In-place note.** Skip — keep the existing skeleton, `astro.config.mjs`, CI.
Just confirm `pnpm verify` is green on `main` before branching.

---

## Phase 2 — content schemas (the contract)

**Goal.** All six collections defined once, in Zod, as the only content
contract.

**Prompt.** "Port `src/content.config.ts` verbatim (docs, competencies,
assessments, tracks, sources, notation). Keep the shared `id` regex, the
`editorialStatus` enum, the `notationSummary` plain-prose refinement, and the
`notationAlignment` discriminated union. Add one fixture entry per collection so
`astro check` has something to type."

**Gate.** `astro check` — 0 errors.

**In-place note.** No change; this file is already correct. If Phase 0 chose
D-b(ii), add a `notation` sub-collection or a `base: true` flag now so the base
library has a home.

---

## Phase 3 — domain calculations

**Goal.** Pure math, no content or UI dependency, fully tested.

**Prompt.** "Port `src/domain/` verbatim: `scalars.ts` (numeric guards),
`present-value.ts` (`presentValue` with compensated summation,
`periodicDiscountFactor`), `bonds/fixed-coupon-bond.ts`. Port
`tests/unit/present-value.test.ts` and `tests/unit/fixed-coupon-bond.test.ts`
(Vitest + fast-check) unchanged. Confirm the model still documents its
boundaries in code comments: level coupons, par redemption, coupon-date
settlement, flat nominal yield."

**Gate.** `pnpm test` — domain suites pass, including property tests.

**In-place note.** No change. This layer is already at the target shape.

---

## Phase 4 — curriculum validation on the collection

**Goal.** One validator, reading the _same_ collection entries the build reads —
no second loader.

**Prompt.** "Rewrite content loading so `validateCurriculum` consumes Astro
collection entries (via `getCollection` in an Astro-context script, or a thin
typed adapter) instead of `scripts/curriculum-files.ts`'s bespoke `gray-matter`
walk. Delete `scripts/curriculum-files.ts`. Keep every semantic check in
`src/curriculum/validation.ts`: invalid/duplicate IDs, unknown/duplicate
references, self-prerequisite, prerequisite cycles (with the reported path),
`requires`∩`teaches`, teach-before-prerequisite-available, assessment coverage
(min independent items + transfer), reviewed-lesson-cites-unreviewed-source,
`\cite`↔`sources:` two-way sync, teaches-without-assumptions, duplicate
assessment item IDs, invalid numeric/choice answers, track ordering. Keep
`pnpm validate:content` as the CLI, printing every issue with a stable prefix."

**Gate.** `pnpm validate:content` passes on the Phase 2 fixtures; deliberately
break one fixture and confirm the exact issue is reported.

**In-place note.** The risk here is the Astro-context requirement for
`getCollection`. Acceptable fallback: keep one small loader module
(`src/content/load.ts`) used by _both_ the validator and any script, replacing
the current two. The non-negotiable is **one** loader, not two.

---

## Phase 5 — the resolved-reference core + notation

**Goal.** Collapse notation resolution into one minimal core; decide the ADR
0003 scope from Phase 0.

**Prompt.** "Build `src/reference/` as the single resolution core:

1. **Loader** — from the notation collection + lesson `notation.uses`/`local`
   (+ the base library if Phase 0 = D-b(ii)), produce the registry input. This
   replaces `scripts/notation-files.ts` and the ad-hoc loads in
   `astro.config.mjs`.
2. **Registry** — port `registry.ts`'s resolution and diagnostics, but keep a
   single scope model (page-local → shared [→ base]). Drop code paths for
   unbuilt ladder levels unless Phase 0 said to build them. Keep: invalid/
   duplicate/conflicting keys, undeclared/undefined/unused references, unused
   imports, reference cycles, transitive page bundles, backlinks.
3. **Alignment** — fold `curriculum-alignment.ts` in as one function, or keep it
   as one adjacent module.
4. **Completeness gate** — keep `math-bindings.mjs`'s KaTeX-parse-tree
   identifier classification; keep the exact-version pin and its guard test.
   Emit the **per-lesson resolution report** (symbol, key, resolving level,
   source span) as a committed snapshot file per lesson.
5. **remark adapters** — `remarkNotation` (`\term{}` → link; `\explain{}{}` →
   trusted marker; run the gate) reading from the core.
6. **KaTeX** — port `katex-options.mjs` trust callback and
   `rehype-fail-katex-errors.mjs` verbatim.
   Delete `NOTATION_ARCHITECTURE.md` (content now in `claude_architecture.md`)."

**Gate.** `pnpm validate:content` + `pnpm test` (notation suites: registry,
compiler, math-bindings, katex-options, alignment). Resolution-report snapshots
committed; a changed binding shows in the diff.

**In-place note.** Move `src/notation/*` → `src/reference/*` in one commit with
no logic change, then simplify in follow-up commits so review is legible. Do
**not** rewrite `math-bindings.mjs` from scratch — it encodes real KaTeX-tree
knowledge; trim it.

---

## Phase 6 — shared UI primitive + notation/citation front-ends

**Goal.** One hover/pin panel. One citation adapter on the same core.

**Prompt.** "Extract `src/components/reference/HoverPanel.*` — the positioning,
pin, Escape/outside-close, and article-column-clamping logic currently
duplicated in `NotationLayer.astro` and `CitationLayer.astro`. Rebuild
`NotationLayer.astro` as: static `<details>` disclosure (no-JS baseline) +
`HoverPanel` enhancement. Port `NotationGlossary.astro`. Then build
`remarkCitation` + `citation-format.mjs` on the Phase 5 loader (sources are just
another reference collection); `CitationLayer` = `HoverPanel` + the generated
`## References` list. The `\cite`↔`sources:` check already lives in Phase 4."

**Gate.** `pnpm test:e2e` — `tests/e2e/notation.spec.ts` and
`citations.spec.ts`, including keyboard, pin, no-JS, and axe checks on pinned
states.

**In-place note.** ADR 0004 already predicts this extraction; update ADR 0004's
"Consequences" once done.

---

## Phase 7 — progress seam + assessment renderer

**Goal.** A real storage seam before anything depends on it.

**Prompt.** "Add `src/progress/ProgressRepository.ts` (interface:
get/set attempt records and per-key state, versioned) and
`LocalStorageProgressRepository.ts` (namespaced key, version field, safe
JSON parse, quota/us-unavailable handled). No component calls `localStorage`
directly. Build `AssessmentRunner.tsx` / `AssessmentSet.astro` to render
assessment JSON by `id`, check `numeric` (value ± tolerance) and
`single-choice` answers, reveal explanation on check, and record attempts
through the repository. Default worked state is legible before hydration."

**Gate.** New `tests/e2e/assessments.spec.ts` (render, check correct/incorrect,
no-JS shows the questions, axe) + a unit test for the local adapter's
version/quirk handling.

**In-place note.** `AssessmentRunner.tsx` / `AssessmentSet.astro` exist
uncommitted — rebase them onto the repository interface rather than
`localStorage`.

---

## Phase 8 — port content, in dependency order

**Goal.** Real content flowing through the new pipeline, each layer green before
the next.

Port in this order, running `pnpm validate:content` after each:

1. `sources/*.json` — verbatim.
2. `competencies/*.json` — verbatim (the prerequisite graph).
3. `assessments/*.json` — verbatim (**verified answer keys — do not touch**).
4. `tracks/*.json` — verbatim.
5. `notation/*.md` — verbatim (shared entries). Add the base library if
   Phase 0 = D-b(ii).
6. Lesson **frontmatter only** — `lessonId`, `requires`, ordered `teaches`,
   `assessments`, `sources`, `notation.uses`/`local`, `assumptions`,
   `editorialStatus: draft`.
7. Lesson **bodies** — one lesson at a time. For each: every worked number must
   reproduce from `src/domain/` or an independent calculation recorded in the
   provenance note; move `\cite` markers to the point of claim (not the closing
   paragraph); confirm every `\term` precedes its first equation; confirm the
   completeness gate passes.
8. Compact-example component + example sets; labs (`DiscountingExplorer`,
   `BondPriceExplorer`) on domain functions with Observable Plot + data-table +
   text alternative.

**Gate.** Full `pnpm verify` green with all real content. Resolution-report
snapshots reviewed. Provenance record written.

**In-place note.** Content already lives here — this phase becomes "re-run
`verify`, fix fallout from Phases 4–7, move citation markers, regenerate
report snapshots." Treat any diff in a golden value as a stop-and-review.

---

## Phase 9 — consolidate the docs

**Goal.** 14 files → 4.

**Prompt.** "Make `claude_architecture.md` the single reference (rename to
`docs/architecture.md` or keep the name — pick one). Reduce `README.md` to a
~40-line quickstart: requirements, `pnpm install` + Playwright, `pnpm verify`,
`pnpm dev`, the repository map table, and a link to the reference doc. Keep
`AGENTS.md` (short, points at the reference doc) and `AI_POLICY.md` (the
enforceable policy, duplication with the reference doc trimmed). Delete
`NOTATION_ARCHITECTURE.md`, `docs/notation-and-units.md` (regenerate the symbol
table from the notation collection if wanted), `CONTENT_STANDARD.md`,
`docs/review-policy.md`, `docs/market-conventions.md` — their content is in the
reference doc. Collapse ADR 0002 + 0003 into one ADR stating the _built_
notation model with 0003 extras marked deferred/scheduled per Phase 0. Keep ADR
0001 and 0004."

**Gate.** `grep -rl 'notation.uses\|\\\\term\|editorialStatus' *.md docs/` returns
only the 4 kept files + ADRs. A fresh reader can find each rule in exactly one
place.

---

## Phase 10 — drop dead weight

**Goal.** Nothing in the tree contradicts the architecture.

**Prompt.** "Delete `src/pages/test_equation.astro` (obsolete MathJax/CDN
prototype). Delete any `scripts/*` superseded by the Phase 4 loader. Remove
unused dependencies (`gray-matter` if the bespoke loaders are gone). Re-pin Node
to the version CI actually runs and update `.nvmrc`/`.node-version`/`package.json`
to match."

**Gate.** `pnpm verify` green; `pnpm why gray-matter` (etc.) shows no
first-party use; `git grep -n mathjax` is empty.

---

## Appendix A — file-by-file disposition of the current repo

| Current path                                                                                                                           | Disposition                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/domain/**`                                                                                                                        | **Port verbatim** + tests. Already at target.                                                |
| `src/content.config.ts`                                                                                                                | **Port verbatim.** Add base-library home if Phase 0 = D-b(ii).                               |
| `src/content/{competencies,assessments,sources,tracks}/**`                                                                             | **Port verbatim** (data).                                                                    |
| `src/content/notation/**`                                                                                                              | **Port verbatim** (data).                                                                    |
| `src/content/docs/**`                                                                                                                  | **Port frontmatter verbatim; re-review bodies**; relocate `\cite` markers; re-enter `draft`. |
| `src/curriculum/validation.ts`                                                                                                         | **Keep logic, change input** to collection entries (Phase 4).                                |
| `scripts/curriculum-files.ts`                                                                                                          | **Delete** — replaced by one shared loader.                                                  |
| `scripts/notation-files.ts`                                                                                                            | **Delete** — merge into `src/reference/` loader.                                             |
| `scripts/validate-curriculum.ts`                                                                                                       | **Keep** as the thin CLI entry.                                                              |
| `src/notation/registry.ts`                                                                                                             | **Port + trim** to one scope model; drop unbuilt-ladder branches.                            |
| `src/notation/math-bindings.mjs`                                                                                                       | **Port + trim.** Keep the KaTeX pin + guard test. Do not rewrite.                            |
| `src/notation/remark-notation.mjs`                                                                                                     | **Port + trim** onto the core.                                                               |
| `src/notation/remark-citation.mjs`, `citation-format.mjs`                                                                              | **Port** onto the core (Phase 6).                                                            |
| `src/notation/{katex-options,rehype-fail-katex-errors}.mjs`                                                                            | **Port verbatim.**                                                                           |
| `src/notation/{references,types,curriculum-alignment}.ts`                                                                              | **Port**; fold `curriculum-alignment` into the registry or keep adjacent.                    |
| `src/notation/{lab-math-scope,render-lab-math}.ts`                                                                                     | **Port**; reuse the core scope type.                                                         |
| `src/components/notation/NotationLayer.astro`                                                                                          | **Rebuild** on `HoverPanel` (Phase 6).                                                       |
| `src/components/citation/CitationLayer.astro`                                                                                          | **Rebuild** on `HoverPanel` (Phase 6).                                                       |
| `src/components/notation/NotationGlossary.astro`                                                                                       | **Port.**                                                                                    |
| `src/components/examples/**`                                                                                                           | **Port** (Phase 8).                                                                          |
| `src/components/assessments/**`                                                                                                        | **Rebase** onto `ProgressRepository` (Phase 7).                                              |
| `src/components/labs/**`                                                                                                               | **Port** onto domain functions (Phase 8).                                                    |
| `src/components/starlight/**`, `CurriculumMap.astro`                                                                                   | **Port** (Phase 8 / layout).                                                                 |
| `src/pages/test_equation.astro`                                                                                                        | **Delete** (Phase 10).                                                                       |
| `astro.config.mjs`                                                                                                                     | **Port**; remove the inline notation/source loads (use the Phase 5 loader).                  |
| `tests/**`                                                                                                                             | **Port**; add `assessments.spec.ts` and the progress-adapter unit test.                      |
| `README.md`                                                                                                                            | **Shrink** to a quickstart (Phase 9).                                                        |
| `docs/architecture.md`                                                                                                                 | **Becomes** the consolidated reference (or is replaced by `claude_architecture.md`).         |
| `NOTATION_ARCHITECTURE.md`, `docs/notation-and-units.md`, `CONTENT_STANDARD.md`, `docs/review-policy.md`, `docs/market-conventions.md` | **Delete** — merged.                                                                         |
| `docs/adr/0001`, `0004`                                                                                                                | **Keep.**                                                                                    |
| `docs/adr/0002`, `0003`                                                                                                                | **Collapse into one.**                                                                       |
| `AGENTS.md`, `AI_POLICY.md`, `ai/prompts/**`, `ai/provenance/**`                                                                       | **Keep.** Trim `AI_POLICY.md` duplication.                                                   |
| `reference-library/README.md`                                                                                                          | **Keep.**                                                                                    |
| `SECURITY.md`, `DISCLAIMER.md`, `CONTRIBUTING.md`                                                                                      | **Keep** (short, load-bearing).                                                              |

---

## Appendix B — target doc set

| File                                                                             | Role                                                                                                                            | Length     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `README.md`                                                                      | Quickstart + repo map + link to the reference                                                                                   | ~40 lines  |
| `docs/architecture.md` (= `claude_architecture.md`)                              | The single reference: features, pipeline, boundaries, content model, notation, citations, gates, authoring, governance, testing | ~450 lines |
| `AGENTS.md`                                                                      | Agent entry point: read the reference, preserve boundaries, keep AI work `draft`, run `pnpm verify`                             | ~25 lines  |
| `AI_POLICY.md`                                                                   | Enforceable policy (the "must never" list)                                                                                      | ~35 lines  |
| `docs/adr/000N-*.md`                                                             | One per irreversible decision: stack (0001), notation model (0002+0003 merged), citations (0004), + any new Phase-0 call        | short      |
| `reference-library/README.md`, `SECURITY.md`, `DISCLAIMER.md`, `CONTRIBUTING.md` | Unchanged                                                                                                                       | short      |

Everything else an agent needs is derivable from schemas, the validator's
output, and the per-lesson resolution reports — not from prose.
