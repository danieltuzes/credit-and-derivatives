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
track JSON ──────────────┘

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
progress UI    → progress interface → storage adapter
```

- `src/domain/` must not import React, Astro, content, or browser APIs.
- Components must not contain independent copies of pricing formulas.
- Competency IDs are the source of truth for prerequisites.
- Lesson order may satisfy prerequisites only through its ordered `teaches`.
- Build scripts may inspect content but must not silently rewrite it.
- User-authored or remote MDX must never be compiled.

## Content pipeline

1. Astro content collections schema-check every authored entry.
2. The semantic validator checks references across collections.
3. It rejects unknown or duplicate IDs, graph cycles, invalid lesson and track
   order, missing assessment evidence, invalid answers, and inconsistent review
   states.
4. Astro renders static pages.
5. Only explicitly marked interactive islands ship client JavaScript.

Both `pnpm build` and `pnpm verify` run semantic validation.

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
- KaTeX for mathematical rendering.
- Observable Plot for accessible chart construction.
- Vitest and fast-check for numerical verification.
- Playwright and axe for browser and accessibility checks.
- pnpm with an exact lockfile for reproducible dependencies.

Changes to these choices should state the concrete learner or maintenance need
and usually add an architecture decision record.

## Future seams

The design leaves room for an assessment renderer, local progress repository,
server-backed accounts, controlled data adapters, Web Workers, and additional
assessment engines. These are extension points, not current commitments.
