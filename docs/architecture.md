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
   notation scope.
3. Semantic validation rejects unknown or duplicate IDs, graph and notation
   cycles, undeclared shared notation, invalid lesson and track order, missing
   assessment evidence, invalid answers, alignment errors, and inconsistent
   review states.
4. Remark rewrites prose notation references and inspects semantic math
   annotations.
5. KaTeX renders equations to HTML and MathML at build time. Astro renders the
   lesson and consumes each registry's resolved transitive page bundle for the
   static notation disclosure; the shared collection supplies the glossary and
   basic backlinks.
6. Only labs and optional notation presentation behavior ship client
   JavaScript.

Both `pnpm build` and `pnpm verify` run semantic validation.

## Notation boundary

Notation is educational content, not calculation logic. Shared definitions
live as Markdown entries under `src/content/notation/`; page-local definitions
live in schema-checked lesson frontmatter. Every definition has a semantic key
that is independent of its displayed LaTeX.

Lessons explicitly import shared meanings through `notation.uses`. Their
`notation.local` entries are automatically available only in that lesson.
Resolution is lexical: page-local definitions first, then declared shared
definitions. Shared definition bodies resolve only against other shared
definitions, so their meaning cannot change with the calling page.

In MDX source prose, `\term\{key\}` escapes the braces from MDX expression
parsing; the Markdown AST exposes `\term{key}`, which becomes a normal link.
Shared `.md` notation bodies use `\term{key}` directly. Inside `$...$` or
`$$...$$` math, `\explain{key}{latex}` preserves the LaTeX while attaching its
semantic key.
Nested annotations are allowed. The notation registry validates keys,
definitions, imports, references, cycles, curriculum alignment, introduction
order, review states, unused imports, and unused definitions. It also builds
page bundles and backlinks.

KaTeX remains build-time-only and produces HTML plus MathML. Its trust callback
accepts exactly one validated `data-notation-key` emitted by `\explain`; it
does not permit arbitrary links, styles, IDs, protocols, or HTML. No lesson
owns an inline explanation dictionary, direct author-written `\htmlData` is
rejected before rendering, and no MathJax or remote script is used.

Each notation-enabled page has a native disclosure containing its resolved
definitions. The shared glossary is built from the same collection. Browser
JavaScript may highlight, position, focus, or pin an explanation, but does not
render math, resolve scope, mutate definitions, or calculate finance. With
JavaScript disabled, the equations, MathML, disclosure, links, and glossary
remain available.

This decision is recorded in
[`docs/adr/0002-notation-authoring.md`](adr/0002-notation-authoring.md).

## Financial calculation boundary

Numerical models live in `src/domain/` as pure functions with explicit input
units and conventions. Tests cover reference cases, identities, bounds,
monotonic relationships, scaling, and invalid inputs.

The current bond model intentionally supports only level coupons, redemption at
par, settlement on a coupon date, and a flat nominal yield compounded at coupon
frequency. It does not silently pretend to support schedules, accrued interest,
credit, liquidity, tax, or embedded options.

## Interaction boundary

A lab consists of validated inputs, a pure model call, a stateful React view, a
textual interpretation, a data-table alternative, and focused tests. A default
worked result should remain understandable before client JavaScript loads.

Heavy calibration or Monte Carlo can later move to Web Workers, but the model
API must remain deterministic given explicit inputs and a visible random seed.

Notation enhancement follows the same progressive-enhancement rule but is not
a React lab. Static definition lists and links are the accessible baseline;
hover, focus, tap, and pin behavior are an optional presentation adapter.

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

The design leaves room for an assessment renderer, local progress repository,
server-backed accounts, controlled data adapters, Web Workers, and additional
assessment engines. The notation subsystem can later add a virtual/generated
registry module, richer nested panels, automatic per-equation tables, and
round-trips to tested domain examples. Inline definition syntax remains
deliberately deferred. These are extension points, not current commitments.
