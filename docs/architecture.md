# Architecture

## Purpose

This document describes the system-wide structure and the boundaries that keep
content, financial calculations, interactions, and learner progress reliable.

It answers “why is the repository arranged this way?” The editor workflow lives
in the root [`README.md`](../README.md). Detailed module documentation belongs
beside the relevant code. Record major, difficult-to-reverse choices in
`docs/adr/`.

## Goals

- Serve most material as accessible static HTML.
- Add JavaScript only when interaction materially helps learning.
- Represent prerequisite knowledge as validated data.
- Keep financial calculations deterministic, typed, and independently tested.
- Make AI-assisted contributions visible and reviewable.
- Preserve seams for future progress synchronization without requiring it now.

## Non-goals

The playground is not a production valuation or risk system, trading or
recommendation service, live market-data product, locked learning-management
system, or runtime AI tutor.

## System shape

```text
lesson MDX ──────────────┐
competency JSON ─────────┤
assessment JSON ─────────┼→ schemas + semantic validation → Astro build
source JSON ─────────────┤                                → static pages
track JSON ──────────────┤
notation Markdown ───────┘

lesson notation frontmatter + \term\{...\}/\explain references
  → scoped notation registry validation
  → KaTeX HTML+MathML + collection-backed page layer and glossary

interactive React lab → pure TypeScript domain functions
                      → chart + text + data-table output

future learner UI → ProgressRepository → local-storage adapter
```

Astro and Starlight own routing, navigation, static rendering, and the
documentation shell. React islands are for stateful labs. TypeScript domain
modules own mathematical behavior.

## Dependency rules

```text
lesson content → approved components → lab UI → domain modules
curriculum UI  → curriculum model
notation authoring → notation registry → rendering adapters
progress UI    → progress interface → storage adapter
```

- `src/domain/` must not import React, Astro, content, or browser APIs.
- Components must not contain independent copies of pricing formulas.
- Competency IDs are the source of truth for prerequisites.
- Semantic notation keys, rather than glyph strings, are the source of truth
  for symbol meaning.
- Lesson order may satisfy prerequisites only through its ordered `teaches`.
- Build scripts may inspect content but must not silently rewrite it.
- User-authored or remote MDX must never be compiled.

## Content pipeline

1. Astro content collections schema-check every authored entry.
2. The curriculum and notation registries resolve references and lexical
   notation scope, applying the fixed resolution ladder (token `\explain`,
   equation-local gloss, section `\let`, page `\def`, `notation.uses`, then
   the domain-filtered collection).
3. Semantic validation rejects unknown or duplicate IDs, graph and notation
   cycles, undeclared shared notation, invalid lesson and track order, missing
   assessment evidence, invalid answers, alignment errors, inconsistent review
   states, any variable in rendered math that does not resolve to a semantic
   key, and partially overlapping explanation spans. It warns when one glyph
   resolves to two meanings in a lesson.
4. Remark rewrites prose notation references, inspects semantic math
   annotations, classifies identifier versus operator atoms for the
   completeness gate, and records a per-lesson resolution report. A second
   remark pass rewrites `\cite\{source-id\}` prose markers into numbered
   superscript links and appends a generated "References" list; semantic
   validation keeps every `\cite` id and every `sources:` id in step.
5. KaTeX renders equations to HTML and MathML at build time. Its upstream
   adapter recovers parse failures as `.katex-error` markup, so a repository
   post-render gate turns that markup into a fatal compiler diagnostic. Astro
   renders the lesson and consumes each registry's resolved transitive page
   bundle for the static notation disclosure; the shared collection supplies
   the glossary and basic backlinks.
6. Only labs and optional progressive UI adapters ship client JavaScript. The
   notation layer, compact-example tabs, and desktop edge controls retain
   static or native-HTML fallbacks. A dev-only authoring overlay colours each
   symbol by binding state and never enters a production build.

Both `pnpm build` and `pnpm verify` run semantic validation. `pnpm verify` also
starts the real Astro server in Playwright and independently rejects HTTP/MDX,
browser-console, and recovered `.katex-error` failures on every lesson route.

## Notation boundary

Notation is educational content, not calculation logic. Shared definitions live
as Markdown entries under `src/content/notation/`; page-local definitions live
in schema-checked lesson frontmatter or in inline `\def`. Every definition has
a semantic key that is independent of its displayed LaTeX.

Lessons explicitly import shared meanings through `notation.uses`; their
`notation.local` entries and the base notation library (universal constants and
operators) are in scope automatically. Binding is resolved at build time by a
fixed ladder -- `\explain` on the token, an equation-local gloss, the nearest
section `\let`, the nearest earlier page `\def`, a unique `notation.uses`
match, then a unique domain-filtered collection match. More than one candidate
at a level is an error. Shared definition bodies resolve only against other
shared definitions, so their meaning cannot change with the calling page. The
page's static bundle must define every symbol it uses; `\let` and `\def` only
disambiguate among in-scope meanings.

Every variable in rendered lesson mathematics must resolve to a key. The remark
stage classifies identifier atoms against operators using KaTeX's MathML, and
`pnpm validate:content` fails on an unresolved variable and on partially
overlapping explanation spans. It warns when one glyph resolves to two meanings
in a lesson. The validator also writes a per-lesson resolution report -- symbol,
key, resolving level, source span -- that is a checked snapshot and the
quantitative reviewer's binding artifact.

In MDX source prose, `\term\{key\}` escapes the braces from MDX expression
parsing; the Markdown AST exposes `\term{key}`, which becomes a normal link.
Shared `.md` notation bodies use `\term{key}` directly. Inside `$...$` or
`$$...$$` math, `\explain{key}{latex}` preserves the LaTeX while attaching its
semantic key. A sub-expression is explainable only through a group macro that
carries a key -- `\group{expr}{key}` or `\underbrace{expr}_{\explain{key}{...}}`
-- and its span must be disjoint from or nested within every other span. A
whole-equation meaning is the block attribute `:::equation{explains: key}`.
Nested annotations are allowed. The notation registry validates keys,
definitions, imports, references, cycles, curriculum alignment, introduction
order, review states, unused imports, and unused definitions, and builds page
bundles and backlinks.

KaTeX remains build-time-only and produces HTML plus MathML. Its trust callback
accepts exactly one validated `data-notation-key` emitted by `\explain`; it
does not permit arbitrary links, styles, IDs, protocols, or HTML. No lesson
owns an inline explanation dictionary, direct author-written `\htmlData` is
rejected before rendering, and no MathJax or remote script is used.

Each notation-enabled page has a native disclosure containing its resolved
definitions. The shared glossary is built from the same collection. Browser
JavaScript may highlight, position, focus, pin, or -- per reader preference,
keyed by semantic key through the `ProgressRepository` seam -- mute an
explanation, but does not render math, resolve scope, mutate definitions, or
calculate finance. Muting never removes a lesson's first canonical disclosure
entry. A dev-only authoring overlay colours each symbol by binding state and
toggles equations between rendered math and source; it never ships in a
production build. With JavaScript disabled, the equations, MathML, disclosure,
links, and glossary remain available.

These decisions are recorded in
[`docs/adr/0002-notation-authoring.md`](adr/0002-notation-authoring.md) and
[`docs/adr/0003-notation-completeness-and-scoped-binding.md`](adr/0003-notation-completeness-and-scoped-binding.md).

## Citation boundary

Citations follow the same shape as notation. An author writes
`\cite\{source-id\}` — or `\cite\{source-id\}\{locator\}` for a use-specific
section — in lesson prose; the id resolves against `src/content/sources/`. The
build numbers each distinct `(source-id, locator)` pair by first appearance,
renders a superscript `[n]` anchor, and appends a "References" list to the
page. That list and the anchor links are the accessible baseline; the
`CitationLayer` island only adds a hover/pin panel over the same markup.
Locators are plain text, because earlier remark passes would consume Markdown
or `$math$` in the brace group. Semantic validation requires every declared
source to be cited and every citation to be declared. AI-assisted citations
and their source records stay `draft` until a human confirms the locators.
Recorded in
[`docs/adr/0004-source-citations.md`](adr/0004-source-citations.md).

## Financial calculation boundary

Numerical models live in `src/domain/` as pure functions with explicit input
units and conventions. Tests cover reference cases, identities, bounds,
monotonic relationships, scaling, and invalid inputs.

The current bond model intentionally supports only level coupons, redemption at
par, settlement on a coupon date, and a flat nominal yield compounded at coupon
frequency. It does not silently pretend to support schedules, accrued interest,
credit, liquidity, tax, or embedded options.

The credit modules add a constant-hazard survival curve and a deliberately
narrow one-period recovery-of-par-at-maturity value. The latter keeps survival
and recovery payments at the same maturity date; its name and return components
make that timing assumption visible rather than presenting it as a general
risky-bond model.

The original generic CDS module values caller-supplied contiguous model-year
periods with an explicit representative default time and either no accrued
premium or a half-period approximation. It remains a tested approximation
boundary and is not the model used by the current CDS lab.

The flat-hazard CDS module instead assumes a deterministic continuously
compounded risk-free rate, deterministic recovery, and one constant
risk-neutral hazard. It integrates protection and accrued premium over exact
modeled default time, returns scheduled and accrued premium components,
positive leg magnitudes, signed protection-buyer value, par running spread, and
the per-period breakdown used by the lab. Its simplified quote converter
root-solves the flat hazard implied by a conventional spread and converts
between that quote and a signed time-zero upfront for a fixed running coupon.

Neither CDS module generates calendar schedules or stubs, applies actual day
counts or business-day rules, bootstraps discount or survival curves, models
recovery uncertainty or counterparty risk, or reproduces the ISDA Standard CDS
Model. The quote/upfront converter is a teaching model, not a trade cash-
settlement calculator. Those omissions remain visible in the lessons and lab.

## Interaction boundary

A lab consists of validated inputs, a pure model call, a stateful React view, a
textual interpretation, a data-table alternative, and focused tests. A default
worked result should remain understandable before client JavaScript loads.

Heavy calibration or Monte Carlo can later move to Web Workers, but the model
API must remain deterministic given explicit inputs and a visible random seed.

Notation enhancement follows the same progressive-enhancement rule but is not
a React lab. Static definition lists and links are the accessible baseline;
hover, focus, tap, and pin behavior are an optional presentation adapter.
Reader-set explanation muting is part of that adapter: it is keyed by semantic
key, stored through the `ProgressRepository` seam, and only hides the inline
affordance, never a lesson's first canonical disclosure entry.

Worked-example groups use a closed native disclosure as their baseline. The
optional adapter turns its directly nested examples into keyboard-operable tabs
after the disclosure opens; without JavaScript and in print, all example
headings and bodies remain available. Desktop navigation and page contents are
visible by default. Optional edge controls can persist a collapsed rail and
preview its panel on pointer hover; mobile keeps Starlight's native menu and
table-of-contents behavior.

## Progress boundary

Progress is not implemented in this skeleton. The intended first implementation
uses a `ProgressRepository` interface and a versioned local-storage adapter.
Lesson and assessment components must not call `localStorage` directly. This
allows a future server-backed adapter without rewriting content.

## Trust boundaries

Treat AI output, pasted documents, third-party data, URLs, browser state,
dependencies, and content submitted outside the reviewed repository as
untrusted. Controls include schemas, semantic validation, allowlisted
components, escaped output, exact dependency versions, minimal workflow
permissions, human review, and no runtime execution of generated prose or code.

## Technology choices

- Astro/Starlight for the content-first static shell.
- MDX for reviewed prose with embedded allowlisted labs.
- React for isolated stateful interactions.
- TypeScript for explicit model boundaries.
- KaTeX for build-time mathematical rendering and narrowly trusted semantic
  symbol markers.
- Observable Plot for accessible chart construction.
- Vitest and fast-check for numerical verification.
- Playwright and axe for browser and accessibility checks.
- pnpm with an exact lockfile for reproducible dependencies.

Changes to these choices should state the concrete learner or maintenance need
and usually add an architecture decision record.

## Future seams

The design leaves room for a local progress repository, server-backed accounts,
controlled data adapters, Web Workers, and additional assessment engines. The
notation subsystem can later add a virtual or generated registry module,
automatic per-equation tables, round-trips to tested domain examples, an
AI-assisted binding-suggestion pass with a `notation:fix` codemod, and
account-backed sync of the reader mute list. These are extension points, not
current commitments.
