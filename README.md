# Credit Products Playground

An interactive, prerequisite-aware introduction to bonds, credit risk, CDS,
CDX, and options on credit products.

This repository is a learning playground. It is not a production pricing
system or a source of investment advice. All current content is deliberately
marked `draft`.

> Educational use only. Examples are simplified, synthetic, and approximate.
> Nothing here is investment, legal, tax, accounting, valuation, or trading
> advice.

## README versus architecture.md

This root README is the working handbook for **site editors and reviewers**. It
answers: “How do I safely add or revise learning material?” It belongs at the
repository root because it should be the first file every contributor sees.

[`docs/architecture.md`](docs/architecture.md) is for developers and
maintainers. It answers: “Why is the system arranged this way, and which
technical boundaries must a change preserve?” An editor only needs it when
changing schemas, labs, calculation code, progress storage, or the build
pipeline.

## Quick start

Requirements:

- Node.js 24; the tested patch version is in `.nvmrc` and `.node-version`;
- pnpm through Corepack;
- Playwright Chromium for the required browser checks.

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm verify
pnpm dev
```

Open the address printed by Astro, normally `http://localhost:4321`.

Run `pnpm verify` before requesting review. It checks formatting, content
references, TypeScript/Astro, numerical and curriculum tests, a real Astro
server in Chromium, rendered KaTeX, browser accessibility, and the static
production build.

## What the playground already demonstrates

- A Starlight documentation site built as static HTML.
- One ordered eight-lesson path: four financial/rate foundations followed by
  four fixed-rate bond lessons.
- React learning labs embedded as selectively hydrated islands.
- Build-time KaTeX equations, semantic symbol explanations, a generated
  notation glossary, and an Observable Plot price/yield curve.
- Pure TypeScript present-value and bond-pricing functions.
- Seventeen atomic competencies and eight assessment sets containing 34
  direct/transfer items.
- Nineteen shared notation entries plus page-local definitions.
- A generated curriculum map.
- Semantic validation of IDs, prerequisites, lesson order, track readiness,
  assessment coverage, notation scope, sources, and review status.
- Unit, property-based, curriculum, browser, and accessibility test examples.

The assessment records exist, but a learner-facing assessment renderer and
progress store are intentionally left for the next vertical slice.

## Repository map

| Path                        | Purpose                                                 |
| --------------------------- | ------------------------------------------------------- |
| `src/content/docs/`         | MDX lesson and site pages                               |
| `src/content/competencies/` | Atomic knowledge and skill records                      |
| `src/content/assessments/`  | Direct and transfer questions                           |
| `src/content/notation/`     | Centralized shared notation definitions                 |
| `src/content/sources/`      | Registered references                                   |
| `src/content/tracks/`       | Intended learning paths                                 |
| `src/content.config.ts`     | Authoritative schemas for all content                   |
| `src/components/labs/`      | Interactive React views                                 |
| `src/domain/`               | Pure financial and mathematical calculations            |
| `src/curriculum/`           | Curriculum graph and semantic validation                |
| `src/notation/`             | Notation parsing, registry, scoping, and KaTeX adapters |
| `src/components/notation/`  | Page notation layer and generated glossary              |
| `scripts/`                  | Repository-level validation commands                    |
| `tests/`                    | Numerical, curriculum, browser, and accessibility tests |
| `docs/`                     | Architecture, conventions, and review policies          |
| `ai/`                       | Approved prompt templates and provenance records        |

## Understand the curriculum model first

The site separates concepts that are often accidentally conflated:

- A **topic** is broad, such as bond risk or CDS pricing.
- A **competency** is one small, assessable ability.
- A **lesson** teaches an ordered set of competencies.
- An **assessment item** provides evidence for one competency.
- A **source** supports a factual, contractual, or quantitative claim.
- A **notation entry** gives one semantic quantity a stable key, glyph, units,
  meaning, curriculum home, and review state.
- A **track** gives lessons an intended order.
- A **lab** lets a learner manipulate a reviewed model.

Competencies form a directed prerequisite graph:

```text
interpret a discount factor
            ↓
calculate a discount factor
            ↓
calculate present value
            ↓
price a fixed-coupon bond
            ↓
explain the price–yield relationship
```

Do not use sidebar position as a substitute for prerequisites. Page views are
also not evidence of learning. The eventual progress model should use:

```text
unseen → exposed → practicing → demonstrated → refresh_due
```

Learners should remain able to browse freely; readiness is guidance rather
than a lock.

## How an editor should proceed

Build one complete vertical slice at a time:

1. Write observable learner outcomes using verbs such as explain, calculate,
   distinguish, construct, or hedge.
2. Search `src/content/competencies/` and reuse existing competencies.
3. Add any missing atomic competencies and their direct prerequisites.
4. Add at least two independent assessment items per competency, including a
   transfer item.
5. Register the sources and exact locators that support the material.
6. Reuse shared notation entries and add genuinely page-local definitions.
7. Write the MDX lesson, declaring `requires`, ordered `teaches`, assessments,
   sources, notation, and model assumptions.
8. Add a lab only when changing an input materially improves understanding.
9. Add the lesson ID to a track after its required competencies are available.
10. Preview the lesson, notation layer, glossary, and curriculum map locally.
11. Run `pnpm verify` and complete separate editorial and quantitative reviews.

This order prevents polished prose from hiding a missing prerequisite or
unassessed skill.

### 1. Add a competency

Create one JSON file under `src/content/competencies/`. The filename and `id`
must match exactly. Use stable, lowercase, namespaced IDs:

```text
rates.discount-factor.calculate
bonds.price-from-yield.calculate
credit.hazard-from-survival.calculate
cds.par-spread.calculate
```

Example:

```json
{
  "id": "credit.hazard-from-survival.calculate",
  "title": "Calculate survival from hazard",
  "domain": "credit",
  "facet": "calculation",
  "outcome": "Calculate survival probability from a constant hazard rate.",
  "prerequisites": ["math.conditional-probability.interpret"],
  "evidence": {
    "minimumIndependentItems": 2,
    "requiresTransfer": true,
    "requiresUnassistedPass": true
  },
  "misconceptions": [
    "Hazard rate and cumulative default probability are interchangeable."
  ],
  "editorialStatus": "draft"
}
```

A good competency has one observable outcome. Split a record that tries to
“derive duration, explain convexity, and hedge a callable bond.”

### 2. Add sources before writing claims

Create a JSON record under `src/content/sources/`:

```json
{
  "id": "example-primary-source",
  "type": "primary",
  "title": "Document title",
  "organization": "Publishing organization",
  "url": "https://example.com/document",
  "locator": "Section 4.2, equation 7",
  "accessed": "2026-08-27",
  "licenseNotes": "Link and paraphrase only.",
  "editorialStatus": "draft"
}
```

Prefer sources in this order:

1. Contractual, regulatory, exchange, or standards documents.
2. Original papers and official technical documentation.
3. Established textbooks.
4. Clearly identified secondary explanations.

AI output, search snippets, and unsourced market lore are not sources. Do not
copy licensed contractual text into the repository merely because an AI model
can access it. Market conventions need an effective or access date.

Cite a registered source in lesson prose with `\cite\{source-id\}` or, with a
use-specific locator, `\cite\{source-id\}\{§1.2, eqs. 1.1-1.3\}`. Each distinct
`(source-id, locator)` pair renders as a superscript `[n]` that links to a
generated **References** list at the end of the page; the hover panel is an
optional enhancement over that list. Keep locators to plain text (section and
equation numbers, `Table`, `Figure`) with no Markdown or `$math$`. Every id in
`sources:` frontmatter must be cited at least once, and every `\cite` id must
appear in `sources:`; `pnpm validate:content` enforces both.

### 3. Add assessments

Create a JSON record under `src/content/assessments/`. Each item measures one
competency and declares whether it is `direct` or `transfer` evidence.

```json
{
  "id": "hazard-check",
  "title": "Hazard and survival check",
  "editorialStatus": "draft",
  "items": [
    {
      "id": "hazard-constant-transfer",
      "type": "numeric",
      "competencyId": "credit.hazard-from-survival.calculate",
      "evidenceKind": "transfer",
      "prompt": "Find three-year survival at a constant 2% annual hazard.",
      "answer": { "value": 0.9417645336, "tolerance": 0.000001 },
      "explanation": "Under this model, S(t) = exp(-lambda t)."
    }
  ]
}
```

The full schema supports numeric and single-choice items. See
`src/content/assessments/discount-factor-check.json` for both forms.

Assess the outcome, not trivia from the lesson. Numeric answers should come
from reviewed domain code or an independent calculation. Do not copy a prose
answer back into a test and call that independent verification.

### 4. Add a lesson

Place an `.mdx` file under the appropriate `src/content/docs/` directory:

```mdx
---
title: Hazard and survival
description: Build intuition for conditional default intensity.
lessonId: credit.hazard-and-survival
editorialStatus: draft
riskTier: 2
estimatedMinutes: 25
requires:
  - math.conditional-probability.interpret
teaches:
  - credit.hazard.interpret
  - credit.hazard-from-survival.calculate
assessments:
  - hazard-check
sources: [] # NEEDS_SOURCE: register and verify the supporting source first.
assumptions:
  - Piecewise-constant deterministic hazard
  - ACT/365F year fractions
notation:
  uses:
    - valuation-time
    - payment-time
  local:
    - key: hazard-interval-index
      notation: i
      title: Hazard interval index
      summary: Selects one interval in this lesson's piecewise model.
      details: The index is local bookkeeping, not a time or probability.
      formula: 'i \in \{1,\ldots,n\}'
      sources: []
      seeAlso:
        - payment-time
      alignment:
        kind: general
        rationale: Finite indexing is part of the track entry assumptions.
aiAssisted: true
---

## What you will be able to do

State observable outcomes here.

## Intuition

Start with the conditional question answered by hazard.

## Model and notation

Define every symbol, unit, clock, sign, and convention.

## Worked example

Show intermediate values and rounding.

## Try it

Use an approved interactive component when it adds insight.

## Check your understanding

Point to the declared assessment.

## Model boundary

State what this model omits and when it should not be used.
```

The order of `teaches` matters. A competency may depend on an earlier
competency taught in the same lesson. `requires` contains only what the learner
must know before entering the lesson; do not repeat all transitive ancestors.

Every quantitative lesson should include:

- intuition before algebra;
- explicit notation, units, dates, signs, and cash-flow perspective;
- model and market conventions;
- a reproducible worked example;
- direct and transfer checks;
- visible assumptions and failure modes;
- registered sources with useful locators.

#### Keep a three-example set compact

When a lesson has three reinforcing examples, keep the rule or definition they
depend on visible, then place the examples in one collapsed set. Use labels that
say what changes between cases; “Annual compounding” is more useful than
“Example 1.” Keep interactive labs outside the disclosure so their hydration
and controls are not hidden inside an inactive tab.

```mdx
import CompactExample from '../../../components/examples/CompactExample.astro';
import CompactExamples from '../../../components/examples/CompactExamples.astro';

<CompactExamples
  summary="Worked examples"
  hint="Open the set, then choose a compounding case."
  tabsLabel="Compounding examples"
>
  <CompactExample label="Annual compounding">First example…</CompactExample>
  <CompactExample label="Semiannual compounding">
    Second example…
  </CompactExample>
  <CompactExample label="Basis-point arithmetic">Third example…</CompactExample>
</CompactExamples>
```

The set starts collapsed. With JavaScript, the three examples become
keyboard-operable tabs. Without JavaScript, opening the native disclosure shows
all three headed examples. Print output shows every example.

### 5. Author notation by semantic key

Notation is define-once/reference-many content. The stable key describes the
meaning; the LaTeX describes how that meaning is drawn. Do not use a glyph such
as `r`, `P`, or `t` as the lookup key because the same glyph can mean different
things in different models.

Search `src/content/notation/` before adding anything. A quantity reused across
lessons belongs in one Markdown file there:

```md
---
key: discount-factor
notation: 'D(0,t)'
title: Discount factor
aliases:
  - present-value factor
domain: rates
units: current currency-units per future currency-unit
perspective: Converts a deterministic future unit into value at valuation time.
sources:
  - tuckman-serrat-fixed-income
seeAlso:
  - valuation-time
  - payment-time
alignment:
  kind: competency
  introducedByCompetency: rates.discount-factor.interpret
  introducedInLesson: foundations.discount-factors
editorialStatus: draft
aiAssisted: true
---

The discount factor is the value at \term{valuation-time} of one deterministic
unit paid at a future \term{payment-time} under the stated model.
```

The first body paragraph should work as the short page-layer explanation. The
remaining body can add equations, distinctions, and limitations. Shared entries
have their own sources and review state; AI-assisted entries begin as `draft`.

Each lesson declares the shared keys it imports and any definitions that are
meaningful only on that page:

```yaml
notation:
  uses:
    - discount-factor
    - payment-time
  local:
    - key: discounting-payment-index
      notation: k
      title: Discounting payment index
      summary: Selects one payment and its matching discount factor.
      details: The index is bookkeeping; t_k is the time in years.
      formula: 'k \in \{1,\ldots,n\}'
      sources: []
      seeAlso:
        - payment-time
      alignment:
        kind: general
        rationale: Finite indexing is part of the track entry assumptions.
```

`notation.uses` imports **shared** definitions. Local keys are automatically in
that lesson's lexical scope and should not be repeated in `uses`. Promote a
local entry to `src/content/notation/` when another lesson needs the same
meaning. A local entry inherits the lesson's review state; its sources must
still be declared explicitly when it makes a sourced claim.

Introduce an imported or local definition in prose before its first equation:

```md
The \term\{discount-factor\} converts a future unit to valuation time.
```

In an `.mdx` lesson, the braces in `\term\{key\}` must be backslash-escaped so
MDX does not treat them as a JavaScript expression. The Markdown parser removes
those brace escapes, so the notation plugin receives the normal `\term{key}`
form and replaces it with the definition's titled glossary link. Shared
notation bodies are `.md`, not `.mdx`, and therefore use normal
`\term{key}` without escaped braces.

After the meaning is in lesson scope, author ordinary LaTeX:

```tex
D(0,t)
```

The compiler resolves every variable to the unique semantic definition in the
lesson's `notation.local` and `notation.uses` bundle, then injects the trusted
rendering marker. A genuinely unresolved or ambiguous variable is a build
error. This keeps repeated equations readable while making notation coverage
mandatory.

Use an explicit annotation only to disambiguate a glyph or to render a
non-canonical visual form:

```tex
\explain{compounding-frequency}{m}
```

Use `\term\{key\}` only in MDX prose and any exceptional
`\explain{key}{latex}` only inside `$...$` or `$$...$$` math. Do not use
`\(...\)` or `\[...\]` as lesson math delimiters. Code spans and code blocks
are left literal. Inline definition forms such as
`\explain[def]` and `:::def` are intentionally unsupported: definitions must
remain visible in schema-checked frontmatter or the notation collection.

At build time, the registry resolves local scope before shared scope, checks
declared imports and references, detects conflicts and reference cycles,
validates curriculum alignment and review states, and records transitive page
bundles and backlinks. KaTeX then renders HTML and MathML; its trusted
`\explain` macro may emit only a validated `data-notation-key`. Direct
author-written `\htmlData` is rejected, and the marker cannot inject links,
styles, scripts, or arbitrary HTML.

Every notation-enabled lesson receives a static native disclosure containing
the registry's resolved transitive definition bundle. The glossary renders
shared definitions. A small browser enhancement adds hover, focus, tap, and
pin behavior, but it does not perform math or own definitions. With JavaScript
disabled, equations, MathML, the page notation list, and glossary links still
work.

When editing notation:

1. Decide whether the meaning is shared or truly page-local.
2. Reuse the existing semantic key; do not create a synonym to change only a
   glyph.
3. Declare every shared key in `notation.uses`.
4. Introduce the term in prose before its first use, then use ordinary LaTeX;
   add `\explain{key}{latex}` only when unique scope resolution is impossible.
5. Check title, glyph, units, perspective, `seeAlso`, sources, and curriculum
   alignment together.
6. Preview the symbol interaction with pointer, keyboard, touch, and JavaScript
   disabled.
7. Run `pnpm validate:content` and `pnpm verify`.

See [`docs/notation-and-units.md`](docs/notation-and-units.md) for canonical
symbols and [ADR 0002](docs/adr/0002-notation-authoring.md) for the architectural
decision.

`seeAlso` is navigation, not a prerequisite edge. Its targets are still
scope-checked; a shared target used by a local definition must appear in that
lesson's `notation.uses`.

### 6. Add or revise an interactive lab

Editors should reuse approved labs. A new model requires developer and
quantitative review.

A lab must have:

- a clear learning question;
- labeled inputs, units, valid ranges, and deterministic defaults;
- a pure calculation in `src/domain/`;
- a React view that does not reimplement the formula;
- a textual interpretation and data-table alternative;
- keyboard-operable controls;
- tests for reference cases, invariants, boundaries, and invalid inputs;
- explicit assumptions beside the output.

Never evaluate a formula string as JavaScript or compile user-submitted MDX.

### 7. Put the lesson in a track

Add the lesson ID to a record under `src/content/tracks/`. The validator walks
the track in order and fails if a lesson appears before a required competency
has been taught.

## Review lifecycle

```text
draft → in-review → reviewed
```

- `draft`: incomplete or not independently verified. All AI-assisted work
  begins here.
- `in-review`: ready for humans to check sources, pedagogy, formulas,
  conventions, examples, tests, and accessibility.
- `reviewed`: human-approved and passing all automated checks.

A reviewed quantitative lesson requires:

- editorial review for clarity and prerequisite fit;
- quantitative review of formulas, conventions, units, and examples;
- an independent numerical check;
- reviewed source records;
- reviewed shared notation entries and verified local notation;
- successful `pnpm verify`;
- manual keyboard and responsive-layout inspection.

If one person performs both human roles in this playground, do the work as two
separate passes and record it honestly. AI review is not human approval.

## Definition of done for an editor

- [ ] Outcomes are observable and map to atomic competencies.
- [ ] Every prerequisite exists and the graph remains acyclic.
- [ ] Each new competency has sufficient direct and transfer evidence.
- [ ] Current or contractual claims have dated, registered sources.
- [ ] Units, dates, calendars, day counts, signs, and compounding are explicit.
- [ ] Shared notation is imported with `notation.uses`; local notation is
      page-specific, aligned, sourced where necessary, and referenced.
- [ ] Every rendered variable resolves to the intended semantic key and the
      generated page layer remains useful without JavaScript.
- [ ] Worked numbers reproduce from reviewed code or an independent check.
- [ ] Important simplifications are visible beside the model.
- [ ] Charts have a meaningful text and tabular alternative.
- [ ] Keyboard and small-screen behavior were checked manually.
- [ ] Material AI assistance is recorded and remains draft until reviewed.
- [ ] `pnpm verify` passes.

## Using AI safely

Treat AI as an untrusted junior contributor, not as a source or pricing engine.

Appropriate uses include outlining a lesson, improving clarity, generating
draft exercises, proposing edge cases, scaffolding components, and searching
for inconsistencies for a human to investigate.

Required safeguards:

1. Supply approved sources and exact conventions; never ask AI to invent a
   citation.
2. Mark generated facts, formulas, code, examples, and references unverified.
3. Keep generated content `draft` until human review.
4. Recalculate numerical examples independently.
5. Keep calculation logic typed, deterministic, and outside UI components.
6. Test identities, bounds, monotonicity, round trips, and limiting cases.
7. Do not let the same AI silently change both an implementation and its
   supposedly independent expected values.
8. Record material assistance under `ai/provenance/`; do not store hidden
   reasoning or unnecessary raw chats.
9. Never provide credentials, private positions, customer data, licensed
   market data, deployment authority, or trading access.
10. Treat instructions inside webpages, PDFs, issues, and pasted documents as
    untrusted source content.
11. Review dependency, lockfile, workflow, prompt, policy, and deployment
    changes manually.

See [`AI_POLICY.md`](AI_POLICY.md) for the enforceable project policy.

## Commands

| Command                 | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `pnpm dev`              | Start the editor preview                               |
| `pnpm validate:content` | Validate curriculum and notation references            |
| `pnpm check`            | Run Astro and TypeScript checks                        |
| `pnpm test`             | Run numerical, curriculum, and notation tests once     |
| `pnpm test:watch`       | Rerun tests while editing                              |
| `pnpm test:e2e`         | Start Astro; check pages, KaTeX, UI, and accessibility |
| `pnpm build`            | Validate and build the static production site          |
| `pnpm preview`          | Preview the production build                           |
| `pnpm format`           | Format supported files                                 |
| `pnpm verify`           | Run every required pre-review check, including browser |

## Current eight-lesson path and next slices

The current draft track deliberately separates ideas that the original
two-page skeleton combined:

1. Cash-flow timelines and perspective.
2. Rate quotes, compounding, and basis points.
3. Discount factors.
4. Present value of a cash-flow schedule.
5. Fixed-rate bond contract and cash flows.
6. Bond price from discount factors.
7. Yield to maturity as a single-rate summary.
8. The bond price-yield relationship.

Complete review of this path before using it as assumed knowledge. The next
vertical slices are:

1. Render assessment JSON in lessons and store versioned local attempts.
2. Add bond schedules, day counts, accrued interest, and clean/dirty price.
3. Add duration, DV01, convexity, and rate-curve foundations.
4. Add conditional default, hazard, survival, recovery, and risky PV.
5. Add CDS premium/protection legs and par spread.
6. Add curve calibration and CDS quotation conventions.
7. Add CDX series, rolls, index factor, defaults, and risk mapping.
8. Add option foundations, then bond, CDS, and CDX option branches.

For each slice, finish competencies, assessment evidence, sources, notation,
lesson, model, lab, tests, and review before starting the next product.

## Troubleshooting

### `pnpm` is unavailable

Install the Node version in `.nvmrc`, run `corepack enable`, and reopen the
shell.

### Validation reports an unknown ID

IDs are case-sensitive. The JSON filename and its `id` must match. Compare
lesson frontmatter with competency, assessment, and source records.

### Validation reports a cycle

The prerequisite chain points back to itself. Inspect the path printed by the
validator and split or correct the competencies. Do not hide a real cycle by
changing sidebar order.

### MDX fails to build

Check frontmatter against `src/content.config.ts`. Close JSX tags and import
only repository components. Browser APIs belong inside client components, not
at MDX module scope. A `KaTeX rendering failed` diagnostic means malformed
lesson math reached the renderer; inspect the source expression named in the
error, including braces around fractions, subscripts, and superscripts.

### Validation reports an undeclared or undefined notation key

Check the semantic key, not the displayed LaTeX. A shared `\term\{key\}` or
`\explain{key}{latex}` key must exist under `src/content/notation/` and appear in the
lesson's `notation.uses`. A local key must exist in that lesson's
`notation.local`. Keys are case-sensitive. Do not fix the error by duplicating
the definition under a new key.

### A symbol renders but has no explanation

Every lesson variable must now receive notation behavior from scope. Confirm
the semantic entry is in `notation.local` or `notation.uses`, is unique for the
glyph, and was introduced in prose with `\term\{semantic-key\}`. Math must use
`$...$` or `$$...$$`; do not use `\(...\)` or `\[...\]`. If compilation and
`pnpm test:e2e` pass but hover still shows no panel, treat that as a UI
regression rather than repairing content with redundant `\explain` markup.

### A test disagrees with a worked example

Treat the example as unverified. Check decimal versus percentage rates,
frequency, time units, cash-flow signs, schedules, day counts, accrued
interest, recovery assumptions, and rounding. Never update an expected value
only to make a test green.

## Owner decisions still required

Before accepting public contributions or deploying broadly:

- choose explicit licenses for code and educational content;
- add real owners to `.github/CODEOWNERS` and enable branch protection;
- choose the static host and review its deployment permissions;
- decide how reviewer identity and review dates will be stored;
- decide whether learner progress stays local or becomes account-backed.
