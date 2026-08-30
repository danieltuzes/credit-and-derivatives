# ADR 0003: Notation completeness and scoped binding

- Status: accepted for the playground
- Date: 2026-08-28
- Supersedes parts of [ADR 0002](0002-notation-authoring.md)

## Decision

Extend the semantic-notation model of ADR 0002 so that explanation coverage is
machine-checked and most symbols bind from scope rather than from per-token
markup.

### Completeness gate

Every variable in a lesson's rendered mathematics must resolve to a semantic
key. `pnpm validate:content` fails on an unresolved variable and prints its
`file:line` and token. Operators, digits, delimiters, the differential `d`,
primes, and the base notation library are exempt; the remark stage classifies
identifier atoms against operator atoms using KaTeX's MathML output.

### Base notation library

A repository-owned set of `notation` entries for universal quantities -- the
circle constant, Euler's number, the imaginary unit, `\exp`, `\ln`,
expectation, probability, the indicator, and a generic summation index -- is in
every lesson's scope automatically. Authors neither import nor redefine these.

### Resolution ladder

Binding is resolved at build time by a fixed order. More than one candidate at
any level is a build error, never a silent choice:

1. `\explain{key}{token}` on the token itself;
2. an equation-local gloss;
3. the nearest `\let{glyph}{key}` in the enclosing section subtree;
4. the nearest earlier `\def{glyph}{key}{...}` on the page;
5. a unique match in the lesson's `notation.uses` (base library included);
6. a unique match in the `notation` collection within the lesson's `domain`.

Scope is the default. `\explain` is required only when the ladder cannot
resolve a symbol or the equation renders a non-canonical glyph for its key.

### Inline binding macros

This lifts ADR 0002's deferral of inline definition syntax.

- `\def{glyph}{key}{summary ...}` writes a positioned page-local definition --
  the same shape as a `notation.local` entry -- and binds the glyph from that
  point forward on the page.
- `\let{glyph}{key}` adds no content. It asserts that, for the enclosing
  section subtree only, the glyph denotes an already-resolvable key. The scope
  ends at the next heading of equal or higher level. An unresolvable key is an
  error.
- A sub-expression is explainable only through a group macro that carries a
  key: `\group{expr}{key}` renders as ordinary math with a hover affordance;
  `\underbrace{expr}_{\explain{key}{...}}` renders the visible brace. Both
  register one span. Spans must be disjoint or fully nested; partial overlap is
  a build error.
- A whole-equation meaning is the block attribute `:::equation{explains: key}`,
  not a symbol binding.

Every group key is an ordinary `notation` or `notation.local` entry with its
own review status, sources, and curriculum alignment. No inline free text.

### Standalone resolution

Narrative binding (`\let`, `\def`) only disambiguates among meanings already in
scope. The page's static bundle -- `notation.local` plus `notation.uses` plus
the base library -- must define every symbol the page uses, so an equation
still resolves inside a search excerpt, an embedded snippet, or an isolated
lab. A symbol that resolves only through narrative position, with no bundle
entry, is a warning.

### Resolution report

The validator writes a per-lesson resolution report: each symbol occurrence,
its resolved key, the level that resolved it, and its source span. The report
is a checked snapshot. It is the quantitative reviewer's artifact and a
regression guard -- a changed binding shows up in the diff.

### Reused glyphs

One glyph resolving to two or more keys within a lesson is a warning. The
author acknowledges it explicitly (`notation.reusedGlyphs`) or separates the
meanings into distinct `\let` sections.

### Reader-facing muting

A reader may suppress an explanation by semantic key. Muting hides only the
inline affordance; it never removes a lesson's first canonical disclosure
entry. The state is keyed by semantic key and stored through the
`ProgressRepository` seam, local first. The repository ships an initial muted
set covering the universal constants.

### Authoring overlay

A dev-only authoring mode colours each rendered symbol by binding state
(reviewed entry, draft entry, unresolved, or bound from scope), offers
click-through to the key, its source file, and the resolving level, and toggles
each equation between rendered math and source plus resolution. The watch build
surfaces unresolved symbols as editor diagnostics. The reviewer works from this
overlay and the resolution report, not from raw MDX. The overlay is never part
of a production build.

### Unchanged from ADR 0002

Semantic keys stay independent of glyphs. KaTeX renders HTML and MathML at
build time only, through a trust callback that accepts one validated marker and
nothing else; hand-authored `\htmlData`, MathJax, CDNs, and remote scripts stay
rejected. The static disclosure, MathML, links, and glossary remain usable with
JavaScript disabled. Shared meanings live as `.md` entries under
`src/content/notation/` and are imported through `notation.uses`. AI-assisted
entries stay `draft`, with provenance and human source, pedagogy, quantitative,
and accessibility review.

## Why

A completeness gate turns "is every symbol explained?" from a repeated review
chore into a build check. Scope-based binding removes markup from the common
case while keeping resolution deterministic and reviewable. Section-scoped
`\let` matches how documents actually reuse a glyph -- "in this section, r is
the recovery rate" -- without a fragile most-recent-wins rule that would break
under lesson reordering or reuse. A group macro gives every sub-expression
explanation a real typeset anchor, so hover targets are always disjoint or
nested and never partially overlap. The resolution report gives the finance
reviewer one place to confirm every binding.

## Consequences

The remark stage and validator now parse math structure, maintain lexical scope
with section boundaries, detect span overlap, and emit the resolution report.
`scripts/notation-files.ts`, `src/notation/`, and the notation components must
implement inline `\def`/`\let`/`\group`, the base library, the completeness
gate, and the report before lessons depend on them; until then lessons keep
using `notation.local` frontmatter. Authors write terser equations but must
keep section headings meaningful, since headings now bound `\let` scope. A glyph
reused for two meanings needs a one-line acknowledgement.

## Alternatives rejected

- **Runtime inference from rendered glyphs.** Ships guesses to learners, has no
  page-scope discipline for symbols the author did not bind, and removes the
  incentive to bind at all. Glyph-to-key matching is kept for a build-time fix
  suggestion only.
- **Most-recent-definition-wins across pages.** Dynamic scoping; bindings would
  change silently when lessons are reordered or reused across tracks.
- **Free-text sub-expression explanations.** Not reviewable and not DRY; every
  span must point at a registry entry.
- **Forcing every multi-token concept into a visible `\underbrace`.** Visual
  noise; `\group` is the hover-only alternative.

## Deferred

- An AI-assisted binding-suggestion pass ("did you mean
  `\explain{discount-factor}{DF(t)}`?") and a `notation:fix` codemod.
- A generated or virtual registry module.
- Automatically generated per-equation notation tables.
- Checks tying entry `formula` fields to reviewed `src/domain/` functions.
- Account-backed sync of the reader mute list.
