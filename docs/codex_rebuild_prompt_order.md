# Codex prompt order for a lean rebuild

> Status: draft planning document. AI-assisted on 2026-08-31; every prompt,
> dependency choice, source packet, model result, and review mechanism requires
> human review before it becomes operational.

This document turns
[`codex_repository_blueprint.md`](codex_repository_blueprint.md) into an
ordered series of small, testable Codex tasks. It is intentionally not one
giant "rebuild the site" prompt.

The prompt style follows current
[official OpenAI prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices):
state the outcome, important constraints, evidence, completion bar, and stop
condition once; keep stable policy in repository files; and verify behavior on
representative tasks instead of accumulating repeated instructions.

## How to use this sequence

Assume two paths:

```text
REFERENCE_REPO = the current repository, read-only except for planning docs
TARGET_REPO    = a new repository or isolated version-two branch
```

Use the current repository as behavioral evidence, not as factual authority.
Its lessons, sources, notation, and answer keys are all draft. A human must
supply or approve every source locator, convention, formula, and independent
answer used in the target.

For efficient sessions:

1. Complete the human gate before its following prompt.
2. Use one fresh Codex session per numbered prompt.
3. Let the target repository's concise `AGENTS.md` and product contract carry
   stable rules; do not paste them into every prompt.
4. Start each session from a clean, reviewed checkpoint.
5. Run targeted checks during the task and full `pnpm verify` before the
   checkpoint.
6. Have a human inspect dependency, policy, prompt, workflow, review, source,
   and golden-answer changes.
7. Do not start a later phase while the current phase has unexplained failures.

Each prompt below says "do not commit." This keeps the commit decision and
message with the human. If your workflow explicitly delegates commits, change
that line once in the target `AGENTS.md`; do not repeat a conflicting rule in
every prompt.

## Human gate 0: decisions before code

A human owner must write down:

- target repository path and whether this is a branch or separate repository;
- code and educational-content licenses;
- repository owners, review roles, and default branch;
- supported Node and pnpm versions;
- whether Astro/Starlight, React labs, KaTeX, Vitest, Playwright, and axe remain
  approved choices;
- static host and whether deployment is in or out of the initial scope;
- required version-one features and explicitly deferred features;
- public route policy, including removal of `/test_equation/`;
- initial semantic math authoring choice to prototype;
- how human reviewer IDs are represented without inventing identities;
- whether learner attempts remain session-only or local in the first release;
- approved reference sources and locators for the first lesson slice.

Recommended initial feature boundary:

```text
Required: static lessons, curriculum graph, structured checks, sources,
semantic math completeness, glossary, pure models, one lab, draft/review state,
AI receipts, generated route/accessibility tests.

Deferred: accounts, progress claims, hover panels, custom sidebar rails,
section-scoped glyph rebinding, advanced equation groups, live data, runtime AI,
deployment automation.
```

Stop if these decisions are missing. An AI should not select licenses,
reviewers, financial conventions, or deployment authority.

## Prompt 1: create the small governing contract

```text
Work in TARGET_REPO. Read the human preflight decisions and
REFERENCE_REPO/docs/codex_repository_blueprint.md. Do not copy current
implementation code.

Goal: create only the governing documentation for the new repository.

Create:
- AGENTS.md, limited to stable nonnegotiable rules, task routing, and done rules
- README.md, limited to setup, repository map, main commands, and the short
  human author workflow
- docs/product-contract.md with stable requirement IDs and required/deferred
  behavior
- docs/architecture.md with current boundaries and intended one-compiler flow
- docs/authoring.md with one illustrative lesson bundle
- docs/review.md with draft, human roles, content hashes, and AI receipt rules

Constraints:
- State each rule once and link to its owner.
- Label every behavior required, deferred, or rejected.
- ADRs are historical decisions, never a current feature list.
- Do not invent reviewer identities, licenses, sources, or market conventions.
- Do not scaffold application code, dependencies, workflows, or content yet.

Success criteria:
- AGENTS.md is no more than 70 lines.
- A lesson task can find its required context command from AGENTS.md.
- The product contract distinguishes automated validation from human review.
- Every required feature has a requirement ID and intended test layer.
- The documents contain no claim that a deferred feature exists.

Return changed files, unresolved human decisions, and checks performed.
Do not commit.
```

Human gate: approve the governing contract. This is the stable prefix for all
later work, so contradictions here are more expensive than missing optional
detail.

## Prompt 2: scaffold the smallest working repository

```text
Read AGENTS.md, docs/product-contract.md, and docs/architecture.md in
TARGET_REPO.

Goal: create the minimal pinned toolchain and one static Starlight page.

Implement only:
- the human-approved Node and pnpm pins
- strict TypeScript
- Astro/Starlight static output
- formatting and format checking
- Vitest
- Playwright with Chromium and axe
- a production-preview browser smoke test
- CI that installs the pinned package manager, exact dependencies, and the
  required Playwright browser/dependencies before running verification
- one plain home page and an authored 404 page
- a single pnpm verify command

Constraints:
- Pin dependency versions and workflow actions.
- Use read-only workflow permissions.
- Do not add React, Plot, content schemas, custom sidebars, math, citations,
  assessments, deployment, remote scripts, or lesson content yet.
- Configure the canonical site URL only if the human supplied it.

Success criteria:
- format, type check, unit smoke, browser smoke, and static build pass.
- The browser test runs against production output, not only the dev server.
- The route allowlist contains only home and 404.
- No external runtime request is made.

Return the exact commands run and any environment mismatch. Do not commit.
```

Human gate: review every new dependency, lockfile, workflow permission, and
runtime pin.

## Prompt 3: build one canonical schema and loader

```text
Read AGENTS.md, docs/product-contract.md, docs/architecture.md, and
docs/authoring.md.

Goal: implement one framework-independent content-core schema and loader.

Implement:
- src/content-core/schema.ts as the only schema owner
- TypeScript types inferred from those schemas
- src/content-core/load.ts as the only filesystem loader
- schemas for course, competency, source, shared/local notation, lesson,
  assessment item, human attestation, and AI receipt
- one tiny valid fixture and focused invalid fixtures
- stable ID and source-location types shared by all later code

Use schema defaults for truly universal policy, such as the initial draft state
and the approved default evidence policy. Do not repeat defaults in every
record.

Constraints:
- content-core must not import Astro, React, browser APIs, or domain models.
- Do not create separate script types or hand parsers.
- Keep the authored lesson metadata minimal; do not store facts that can be
  derived later.
- Do not render anything or implement cross-record semantics yet.

Success criteria:
- valid fixtures parse once into inferred types.
- invalid fixtures produce stable diagnostic codes and source locations.
- a repository test proves no second content schema/loader exists.
- all tests and pnpm verify pass.

Return schema decisions that still need human approval. Do not commit.
```

Human gate: approve the authored-versus-derived field list. Removing duplicated
fields later is much harder after content migration.

## Prompt 4: compile one manifest and compact diagnostics

```text
Read the target contract and the content-core code.

Goal: make a single compiler result serve the CLI, tests, and future Astro
rendering.

Implement:
- src/content-core/compile.ts
- a versioned manifest type in src/content-core/manifest.ts
- stable diagnostics in src/content-core/diagnostics.ts
- deterministic ordering and artifact hashing
- an ignored .generated directory
- `pnpm content status`, `pnpm content check --all`, and JSON output

The initial manifest must include artifact IDs, source files, lesson metadata,
direct references, diagnostics, and hashes. Later phases may add resolved
curriculum, terms, citations, and review data without creating a second
manifest.

Constraints:
- Load and parse each authored file once per compiler run.
- One root cause should produce one primary diagnostic.
- JSON diagnostics need code, severity, path, line, column, artifact ID, and a
  compact message; omit stack traces unless debug mode is requested.
- Commands are read-only in this phase.
- Do not integrate Astro or implement UI.

Success criteria:
- repeated compiles are byte-for-byte deterministic.
- malformed and cross-file fixture failures are concise and located.
- `content status` computes counts instead of relying on prose documentation.
- full verification passes.

Return the manifest schema version and example compact diagnostics. Do not
commit.
```

## Prompt 5: consume the manifest in the static site

```text
Read AGENTS.md, the product contract, and content-core.

Goal: render content from the one compiler manifest without another raw file
loader.

Implement:
- an Astro integration or generated typed module that consumes the manifest
- watch-mode recompilation for changed content
- one non-financial fixture lesson route
- generated sidebar/route data from the course manifest
- a static lesson layout that reserves places for assumptions, effective
  status, assessments, notation, and references
- automatic route discovery for browser smoke tests

Constraints:
- Use default Starlight navigation and styling.
- No custom sidebars, React, math, citations, assessment checking, popovers, or
  financial prose yet.
- Do not reread content catalogs in Astro config or components.
- User-authored or remote MDX must never be compiled.

Success criteria:
- changing the fixture updates dev output through the same compiler.
- production-preview tests discover routes from the manifest.
- no page component reads the filesystem or rebuilds a registry.
- static output and no-JavaScript navigation work.

Run targeted tests and pnpm verify. Do not commit.
```

## Prompt 6: implement curriculum and assessment contracts

```text
Read AGENTS.md, the product contract, and the current manifest schema.

Goal: validate a small curriculum graph and lesson-owned evidence before
building assessment UI.

Implement compiler rules for:
- unique valid IDs and references
- competency prerequisite DAG and stable cycle paths
- ordered competencies within lessons
- course/track readiness
- derived external lesson prerequisites
- assessment item ID and option uniqueness
- finite numeric answers and positive tolerances
- each lesson assessment measuring only a competency it teaches, unless an
  explicit shared-assessment link exists
- required direct/transfer counts per taught competency
- orphan records unless explicitly marked standalone
- assumptions required by quantitative lessons

Generate a static curriculum map from the manifest.

Constraints:
- Count evidence in the owning lesson, not globally.
- Do not claim that item count proves pedagogical independence.
- Store any human independence rationale as review data, not an AI conclusion.
- Do not render answer-checking UI or progress.

Success criteria:
- each rule has a focused unit fixture for success and failure.
- the fixture route shows derived prerequisites and evidence summary.
- route/sidebar order has one owner.
- full verification passes.

Return uncovered policy questions. Do not commit.
```

## Prompt 7: add compact, static-first citations

Human input required first: approve the citation syntax and supply one real
source record plus an exact verified locator for the fixture claim.

```text
Read AGENTS.md, docs/authoring.md, docs/review.md, and the source/citation
requirements.

Goal: implement source-backed inline claims with a static accessible baseline.

Use the approved compact syntax, preferably `[@source-id; locator]`.

Implement:
- source metadata validation
- citation parsing only in prose text nodes, never code/MDX expressions
- source existence and locator-presence checks
- used source IDs derived from citation occurrences
- first-appearance numbering of distinct source/locator pairs
- static markers, References list, and backlinks
- draft indication for unreviewed sources
- citation occurrences and locations in the lesson manifest

Constraints:
- Do not add a second `sources:` list to lesson metadata.
- Do not invent or normalize an unverified locator.
- `NEEDS_SOURCE` is allowed in draft prose and blocks review later.
- Do not add a hover panel or client source database.

Success criteria:
- citations work as links with JavaScript disabled.
- unknown/malformed sources and missing locators fail at source location.
- code examples containing citation syntax remain literal.
- only cited source data reaches a lesson page.
- unit, compiler, browser, and accessibility tests pass.

Do not commit.
```

Human gate: open the source and verify the exact rendered attribution. Passing
tests do not verify truth or copyright compliance.

## Prompt 8: prototype and implement minimal semantic math

Human input required first: approve a trial catalog containing representative
scalar, indexed, superscripted, function-like, and nested meanings. Approve the
short semantic command names separately from their keys and displayed glyphs.

```text
Read AGENTS.md, docs/authoring.md, the semantic-math requirements, and only the
current content-core/rendering files.

Goal: implement the smallest define-once/reference-many math system that makes
undefined variables a compiler error.

Prototype the approved short semantic command approach, for example:
- semantic key: discount-factor
- author command: \DiscountFactor
- rendered base glyph: D

Implement:
- shared and lesson-local definitions
- one meaning per semantic key
- one semantic command per variable meaning
- compiler expansion to build-time KaTeX HTML and MathML
- one narrowly trusted data marker generated only by the compiler
- rejection of author-written trusted HTML extensions
- a completeness pass that rejects any remaining variable atom outside a
  registered semantic command
- a static lesson notation table and shared glossary
- term prose syntax, preferably `[[semantic-key]]`
- occurrences, source locations, bundles, and backlinks in the one manifest
- fatal handling of malformed/recovered KaTeX output

Constraints:
- Do not infer meanings from arbitrary raw glyphs.
- Do not use private KaTeX parser APIs.
- Do not implement `\let`, `\def`, domain fallback, reused-glyph guessing,
  equation groups, muting, an author overlay, or popovers.
- Operators/constants need an explicit small allowlist and tests.
- A rare alternate glyph must use one explicit reviewed escape form.

Success criteria:
- the representative equations are readable and no more verbose than the
  human-approved budget.
- every variable is either semantically marked or fails at file:line:column.
- unknown keys, raw variables, malformed math, and unsafe extensions fail.
- the static notation table and MathML work without JavaScript.
- one generated binding report comes from the same manifest.
- unit, compiler, production-browser, and accessibility tests pass.

Report source readability, token comparison with the current form, and any
case the minimal contract cannot express. Do not commit.
```

Human gate: review the source notation, rendered math, MathML, term table,
binding report, and complexity. If the prototype is not clearly simpler, stop
and revise the authoring contract before migrating lessons.

## Prompt 9: derive review state and record AI assistance

```text
Read AGENTS.md, docs/review.md, AI policy requirements, and the manifest hashing
code.

Goal: make stale review impossible to preserve silently.

Implement:
- deterministic artifact dependency closures
- hashes over lesson prose/metadata, checks, used notation, citations/locators,
  and declared model/reference fixtures
- schema-checked editorial and quantitative human attestations
- effective draft/in-review/reviewed state derived from current matching hashes
- a visible effective-status banner in the static lesson
- `pnpm review prepare <lesson>` that writes only a review packet/hash, never an
  approval
- schema-checked AI receipts with prompt ID/version, tool, approved source IDs,
  affected artifacts, numerical/golden changes, and pending human checks
- validation that `NEEDS_SOURCE` or missing current attestations prevents
  reviewed state

Constraints:
- Codex must not create, complete, or infer a human attestation.
- Historical attestations remain history but do not apply after a hash change.
- Do not store hidden reasoning or raw transcripts.
- Do not claim that an AI critique is an independent check.

Success criteria:
- a one-character material lesson change makes effective status draft.
- a shared notation/source/model dependency change invalidates affected
  lessons through the dependency closure.
- untouched unrelated lessons retain applicable attestations.
- invalid or invented review data fails validation.
- static pages show effective status without JavaScript.
- full verification passes.

Do not commit.
```

Human gate: inspect the hash closure carefully. Overly narrow hashes preserve
stale approval; overly broad hashes make unrelated edits invalidate everything.

## Prompt 10: build the AI-efficient author CLI

```text
Read AGENTS.md and the content-core command requirements.

Goal: make normal AI work require a compact dependency slice, not broad manual
file reading.

Implement one scripts/content.ts command router with:
- `content context <lesson> --json`
- `content check <lesson> --json`
- `content check --changed --json`
- `content impact <id> --json`
- `content report <lesson>`
- `content scaffold lesson <id>`
- `content scaffold term <key>`
- `content test <lesson>`
- `content status`
- `ai receipt --changed`

Context output must contain only the target lesson, direct prerequisite
outcomes, used notation definitions, cited source metadata/locators, relevant
domain signatures/reference cases, applicable requirement IDs/tests, review
state, and current diagnostics.

Constraints:
- Do not include source-book text, unrelated lessons, full test bodies, full git
  history, or raw chat transcripts.
- Commands are read-only unless explicitly scaffold/write.
- Scaffolding never overwrites and creates only draft/unapproved data.
- Suggestions may point to an existing key but never invent a source,
  definition, formula, reviewer, or expected answer.

Success criteria:
- context output is deterministic and materially smaller than reading the
  repository guidance/content set.
- changed checks include reverse dependents.
- diagnostics are stable and concise enough for an automatic correction loop.
- commands and failure behavior have unit/integration tests.
- AGENTS.md routes tasks to these commands without growing beyond its limit.

Report context size for the fixture lesson. Do not commit.
```

## Prompt 11: render assessments automatically, static first

```text
Read AGENTS.md, assessment requirement IDs, and the lesson manifest contract.

Goal: render lesson-owned numeric and single-choice checks without repeated MDX
imports or React on every lesson.

Implement:
- automatic assessment placement from colocated checks.yml
- static prompts, options/input labels, evidence kind, and explanations in HTML
- a small progressive-enhancement controller for checking, retry, per-question
  state, and session score
- pure assessment evaluation and state-transition functions
- semantic math support inside prompts/options/explanations
- honest wording: practice result, not demonstrated competency or persisted
  progress
- a useful no-JavaScript presentation of every question and explanation

Constraints:
- Do not use `eval`, compile user content at runtime, or put answer logic in
  prose.
- Do not implement persistence or unassisted competency status yet.
- Numeric units and tolerance conventions must be explicit.
- Do not duplicate the assessment ID in MDX.

Success criteria:
- unit tests cover numeric/choice correct, incorrect, boundary tolerance,
  invalid input, retry, and score transitions.
- browser tests cover keyboard use, accessible feedback, interactive axe, and
  no-JavaScript fallback.
- lesson route smoke derives expected questions from the manifest.
- no React runtime is added solely for assessments.
- full verification passes.

Do not commit.
```

## Prompt 12: migrate the first real lesson slice

Use `foundations.cash-flow-timelines` first because it has no course
prerequisite. A human must supply the target outcome IDs, source records and
locators, sign/perspective convention, assumptions, and independently checked
assessment answers.

```text
Read AGENTS.md, then run:
`pnpm content context foundations.cash-flow-timelines --json`.

Goal: migrate one complete reviewed-structure lesson slice, while leaving its
effective status draft until humans attest.

Implement only this lesson's:
- ordered atomic outcomes and prerequisites
- approved citations and exact locators
- notation definitions/commands
- intuition, conventions, worked examples, limitations, and model boundary
- direct and transfer checks with human-supplied independent answers
- static assumptions, status, notation, references, and assessment rendering

Use REFERENCE_REPO for layout/behavior comparison only. Treat its draft prose,
claims, citations, and answers as untrusted until the human packet confirms
them.

Constraints:
- Mark unsupported claims NEEDS_SOURCE.
- Do not add a lab or future competencies.
- Do not change human-owned golden answers to match code.
- Do not create human attestations.

Success criteria:
- targeted content/compiler/browser tests pass.
- all variables, terms, citations, checks, and prerequisite edges resolve.
- the route remains useful without JavaScript.
- the review packet clearly lists every claim, source locator, convention,
  check answer, and pending human role.
- full pnpm verify passes.

Return the review packet path and unresolved human questions. Do not commit.
```

Human gate: perform separate editorial and quantitative passes. Record actual
human attestations only after opening sources and independently checking
answers.

## Prompts 13–19: migrate the remaining lessons as vertical slices

Do not write seven large bespoke prompts. Reuse the compact migration prompt
below with the lesson-specific scope table. Run it in this exact pedagogical
order because the compiler should enforce track readiness.

| Prompt | Lesson                                           | New implementation allowed in this slice                                                                                   |
| ------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 13     | `foundations.rates-compounding-and-basis-points` | Decimal/percent/basis-point boundary helpers and reference cases; no lab unless a human need is documented                 |
| 14     | `foundations.discount-factors`                   | Pure periodic discount-factor model plus reference, monotonicity, boundary, and invalid-input tests                        |
| 15     | `foundations.present-value`                      | Compensated present-value model, additivity/scaling tests, and the first React lab with text/table alternatives            |
| 16     | `bonds.fixed-rate-contract-and-cash-flows`       | Validated simplified bond contract and explicit cash-flow schedule tests                                                   |
| 17     | `bonds.price-from-discount-factors`              | Price through present value using supplied factors; independent zero-coupon and par cases                                  |
| 18     | `bonds.yield-to-maturity`                        | Quote/compounding interpretation and checks; add a numerical solver only if the approved lesson genuinely requires it      |
| 19     | `bonds.price-yield-relationship`                 | Yield-based pricing, duration only if taught, Plot explorer, chart/table agreement, control-boundary and error-state tests |

Reusable prompt:

```text
Read AGENTS.md. Run `pnpm content context LESSON_ID --json` and
`pnpm content impact LESSON_ID --json`.

Goal: complete only the next ordered lesson vertical slice described in the
approved human task packet.

Inputs supplied by the human packet:
- observable outcome IDs and prerequisite decisions
- approved source IDs and exact locators
- units, signs, dates, clocks, compounding, and market/model conventions
- explicit assumptions and exclusions
- independent numerical fixtures and whether golden changes are authorized
- allowed model/lab scope
- editorial acceptance criteria

Implement, in dependency order:
1. missing catalog records using approved IDs only;
2. pure domain behavior and independent reference/invariant/invalid tests;
3. semantic notation and binding checks;
4. concise lesson prose and reproducible worked examples;
5. direct and transfer checks;
6. a lab only when this row explicitly permits it and interaction adds a
   learning benefit;
7. targeted compiler, UI, no-JS, and accessibility tests;
8. an AI receipt and human review packet.

Constraints:
- Reuse existing definitions and components.
- Never invent or repair citations, conventions, reviewers, or golden answers.
- Keep AI-changed artifacts effectively draft.
- Do not implement later lessons or optional UI polish.
- If implementation and a human-owned golden must both change, stop and report
  the two changes for explicit quantitative review.

Success criteria:
- targeted checks and full pnpm verify pass;
- the course remains prerequisite-valid;
- each taught competency has lesson-owned direct and transfer evidence;
- every rendered variable resolves;
- assumptions, status, notation, citations, and alternatives are static;
- the review packet has no unexplained calculation or source.

Do not commit.
```

Complete the appropriate human editorial/quantitative gate after every row,
not after all seven lessons.

## Prompt 20: add one shared optional popover controller

Run this only if human observation shows that static term/source links are not
enough.

```text
Read AGENTS.md and the notation/citation interaction requirement IDs.

Goal: add one optional progressive-enhancement controller shared by semantic
terms and citations.

Implement:
- pure state and placement functions
- DOM-derived panel content from already rendered escaped static markup
- hover, focus, tap, pin, Escape, outside dismissal, and viewport/article
  collision handling
- one flat accessible control per semantic target
- no-JavaScript behavior unchanged

Constraints:
- Do not serialize a second source/notation database into each page.
- Do not calculate, resolve scope, or author definitions in the browser.
- Do not add muting, reader accounts, or separate duplicated controllers.

Success criteria:
- pure functions have unit tests.
- real focus/pointer/touch/positioning behavior has browser tests.
- axe passes in closed, hovered/focused, and pinned states.
- static links and tables remain fully usable with JavaScript disabled.
- bundle impact is reported and within the human-approved budget.

Do not commit.
```

## Prompt 21: add compact examples only if needed

```text
Read AGENTS.md and the worked-example requirement IDs.

Goal: provide a reusable native disclosure for multiple examples, with an
optional tab enhancement only where it improves scanning.

Implement the smallest component that provides:
- meaningful example labels
- native details/summary baseline
- all examples available without JavaScript and in print
- optional Arrow/Home/End keyboard tabs after hydration
- semantic math compilation inside examples

Constraints:
- Do not force exactly three examples as a global content rule.
- Do not hide labs inside inactive tabs.
- Do not add new calculation logic.

Success criteria:
- unit-test any pure tab state reducer.
- browser-test keyboard, no-JS, print, math, and accessibility behavior.
- migrate examples only where the lesson benefits.

Do not commit.
```

## Prompt 22: decide whether custom layout is justified

The recommended outcome is to keep default Starlight layout. Use this prompt
only if a human can name a learner/editor problem the defaults do not solve.

```text
Read AGENTS.md, the approved layout requirement, and current Starlight
components/tokens.

Goal: solve the named layout problem with the smallest supported customization.

Constraints:
- Preserve native mobile navigation, focus order, zoom, and no-JavaScript
  behavior.
- Prefer public extension points over internal selectors and DOM structure.
- Do not copy the old edge-rail implementation by default.
- Do not persist layout state unless the requirement explicitly needs it.

Success criteria:
- the named problem is demonstrably solved at mobile, narrow desktop, and wide
  desktop sizes.
- keyboard, axe, no-JS, and selected visual geometry checks pass.
- dependency on framework internals and maintenance risk are documented.

Do not commit.
```

## Prompt 23: parity audit and cutover preparation

```text
Read AGENTS.md, docs/product-contract.md, the generated requirements coverage
report, and REFERENCE_REPO/docs/codex_repository_blueprint.md.

Goal: determine whether TARGET_REPO is ready to replace the reference
implementation. This is an audit; do not deploy or delete REFERENCE_REPO.

Verify and report:
- required, deferred, rejected, and accidentally missing features
- all generated routes and internal links
- absence of `/test_equation/`, MathJax, remote scripts, raw untrusted HTML,
  runtime MDX, and duplicate loaders/schemas
- course/competency/assessment/source/notation counts from generated status
- lesson-specific evidence and all semantic math bindings
- model reference, invariant, property, boundary, and invalid-input tests
- human attestation applicability and draft pages
- AI receipt completeness
- no-JavaScript, print, keyboard, touch, responsive, MathML, and accessibility
  behavior
- production-preview browser results
- bundle budgets and unexpected external requests
- supported Node/pnpm verification
- licenses, owners, branch protection, hosting, and deployment decisions still
  pending

Constraints:
- Do not mark content reviewed because tests pass.
- Do not modify implementation and golden fixtures during the audit.
- Do not deploy, publish, merge, or delete without explicit human direction.

Success criteria:
- produce a requirement-ID parity table with evidence paths and blockers.
- every required behavior has a passing automated test at the proper layer.
- every factual/quantitative lesson still awaiting human approval is visibly
  draft.
- full clean pnpm verify passes on the supported runtime.

Return a go/no-go recommendation and the smallest blocker list. Do not commit.
```

Human gate: only the owner decides merge, archival, deployment, branch
protection, and public release.

## Day-to-day prompts after the rebuild

These prompts assume the compact CLI and hash-based review system exist. They
are deliberately short because stable rules live in the repository.

### Correct a lesson under human instruction

```text
Read AGENTS.md. Run `pnpm content context LESSON_ID --json` and
`pnpm content impact LESSON_ID --json`.

Correct only: HUMAN_INSTRUCTION.

Approved evidence: SOURCE_IDS_AND_LOCATORS.
Conventions/units/signs/dates: HUMAN_SUPPLIED_CONTRACT.
Golden-answer changes allowed: YES_OR_NO.

Success means the stated defect is fixed, affected diagnostics/tests pass, no
new unsupported claim is added, review status is correctly invalidated, and an
AI receipt records the change. If the evidence is insufficient, write
NEEDS_SOURCE and report the smallest missing human decision.

Do not create a reviewer attestation or change unrelated content.
```

### Improve human-authored prose without changing claims

```text
Read AGENTS.md and run `pnpm content context LESSON_ID --json`.

Improve clarity and flow in FILE_OR_SECTION. Preserve the existing claims,
citations, equations, examples, outcome scope, structure, and approximate
length. Do not add facts, sources, examples, promotional wording, or new
competencies.

Success means the prose is clearer, semantic references still resolve,
targeted checks pass, material review impact is reported, and an AI receipt is
created if required by policy.
```

### Expand a lesson with a new outcome

```text
Read AGENTS.md. Run `pnpm content context LESSON_ID --json` and
`pnpm content impact NEW_COMPETENCY_ID --json`.

Add only the human-approved outcome NEW_COMPETENCY_ID using the supplied
prerequisites, sources/locators, conventions, assumptions, independent answer
fixtures, and acceptance criteria.

Implement the complete vertical slice: catalog edge, domain behavior if
needed, reference/invariant/invalid tests, notation, concise prose, direct and
transfer checks, targeted UI only if interaction adds learning value, review
packet, and AI receipt.

Do not begin a downstream outcome, invent evidence, or mark the result
reviewed. Stop on a missing source, convention, or independent golden.
```

### Ask AI for a quantitative critique without edits

```text
Read AGENTS.md and run `pnpm content report LESSON_ID`.

Review only; do not edit. Given the declared model, human-supplied source
locators, implementation, independent fixtures, and tests, identify definite
unit/sign/date/compounding/formula/boundary defects separately from questions
that require a human quantitative reviewer.

For each finding, cite the exact artifact and source location, explain the
failed invariant or evidence, and propose the smallest correction. Do not
change expected answers, invent a convention, or call this human approval.
```

### Prepare a human review packet

```text
Read AGENTS.md. Run `pnpm review prepare LESSON_ID`.

Summarize the generated packet without changing content or creating an
attestation. Include changed claims, source locators, semantic bindings,
formulas, units, conventions, worked values, answer keys, domain/reference
tests, UI/accessibility changes, artifact hash, and pending human roles.

If any required item is absent, report the packet incomplete. Do not infer a
reviewer identity or approval.
```

## Prompt maintenance and evaluation

Treat prompt/agent changes like code changes:

1. Keep a small set of representative tasks: prose-only correction, missing
   source, ambiguous symbol, numerical defect, new competency, UI regression,
   and attempted golden-answer drift.
2. Record expected outcomes and prohibited outcomes, not full transcripts.
3. When changing `AGENTS.md`, a prompt, tool description, or model, run the same
   task set before and after.
4. Remove one repeated instruction group at a time.
5. Add an instruction only when it fixes a measured failure.
6. Compare correctness, required evidence, total context, tool loops, latency,
   and human review effort.
7. Keep the smallest prompt/tool set that passes the repository's real cases.

Prompts coordinate the work. Schemas, manifests, diagnostics, tests, and human
attestations determine whether the work is acceptable.
