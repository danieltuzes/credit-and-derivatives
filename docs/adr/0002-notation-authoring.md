# ADR 0002: Semantic notation authoring and progressive explanation

- Status: superseded by [ADR 0003](0003-notation-completeness-and-scoped-binding.md)
- Date: 2026-08-28

> Superseded by ADR 0003 on 2026-08-28. The semantic-key model, build-time
> KaTeX, the narrow trust callback, and the progressive-enhancement rules below
> still hold. ADR 0003 adds the completeness gate, the deterministic resolution
> ladder, inline `\def` / `\let` and sub-expression binding, the per-lesson
> resolution report, and the reader-facing mute list, and it lifts this ADR's
> deferral of inline definition syntax.

## Decision

Give every explained mathematical quantity a stable semantic key that is
separate from its displayed LaTeX.

- Reused definitions live as Markdown entries in `src/content/notation/`.
- Lesson-only definitions live in schema-checked `notation.local` frontmatter.
- `notation.uses` explicitly imports shared definitions. Local definitions are
  automatically available only in their lesson.
- Authors write `\term\{key\}` in MDX prose; MDX removes the brace escapes and
  exposes `\term{key}` to the notation plugin. Shared Markdown definitions use
  `\term{key}` directly. Authors write `\explain{key}{latex}` inside `$...$`
  or `$$...$$` math.
- A deterministic registry resolves local scope before shared scope, validates
  cross-references and curriculum alignment, and derives page bundles and
  backlinks.
- KaTeX renders HTML and MathML at build time. Its trust callback accepts only
  a validated `data-notation-key` marker produced by `\explain`; direct
  author-written `\htmlData` is rejected before rendering.
- Starlight renders the resolved transitive page bundle as a static notation
  disclosure and renders a shared glossary. Client JavaScript only adds hover,
  focus, tap, and pin presentation behavior.

## Why

Raw glyph lookup is ambiguous: `r`, `P`, `t`, and even `D(0,t)` can mean
different things under different products or conventions. Copying explanation
dictionaries into lessons or scripts causes drift, makes review repetitive,
and hides provenance. A semantic registry lets an editor review a reused
meaning, its units, sources, and curriculum home once while allowing each
equation to choose the complete visual token it annotates.

Explicit imports make lesson scope reviewable and cheap to validate. Keeping
math rendering at build time preserves the static architecture, avoids a
MathJax/CDN dependency, and leaves real HTML, MathML, definition lists, and
links when JavaScript is unavailable.

`seeAlso` is a scope-checked navigational relation rather than a dependency
edge. Reciprocal cross-links are valid and do not enlarge transitive page
bundles.

## Consequences

Editors must create or reuse a definition before referencing it and must keep
shared `uses` declarations synchronized. Local notation adds frontmatter, but
prevents one lesson's bookkeeping symbol from becoming an accidental global
meaning. A glyph change does not require changing the semantic key; a meaning
change usually does.

The compiler and validator have more work: they parse notation references,
detect conflicts and cycles, enforce alignment and review-state rules, and
produce page bundles. KaTeX's HTML extension is enabled only through a narrow
attribute allowlist. The browser enhancement must never become the only route
to an explanation.

AI-authored notation entries and materially changed lessons remain `draft` and
require provenance plus human source, pedagogy, quantitative, and
accessibility review.

## Alternatives rejected for the current implementation

- **Raw-LaTeX lookup:** visually identical strings can be authored differently,
  and identical glyphs can carry different meanings.
- **Inline JavaScript dictionaries:** duplicate content, bypass schemas and
  review metadata, and disappear when JavaScript is disabled.
- **Runtime MathJax from a CDN:** adds network and script trust while duplicating
  the existing KaTeX pipeline.
- **Automatic scope from competencies alone:** a competency does not identify
  every explanatory symbol used on a particular page.
- **Local definitions in `:::def` blocks:** harder to schema-check and extract
  deterministically than frontmatter in this first implementation.
- **Inline creation with `\explain[def]`:** terse, but too easy to create
  unreviewed duplicate meanings while writing an equation.

## Deferred extensions

- A generated or virtual registry module if the in-memory build becomes a
  performance bottleneck.
- Richer nested explanation panels and automatically generated per-equation
  notation tables.
- More detailed backlink and “introduced here” views.
- Automated checks tying notation examples to reviewed `src/domain/`
  functions.
- Alternative compact author syntax only if it preserves the same explicit
  schema, scope, validation, and review guarantees.
