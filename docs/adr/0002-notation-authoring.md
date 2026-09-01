# ADR 0002: Semantic notation authoring

- Status: accepted
- Date: 2026-08-28; consolidated 2026-09-01 (folds in the former ADR 0003)

## Decision

Every explained mathematical quantity has a stable **semantic key** that is
separate from its displayed LaTeX.

- Reused meanings are Markdown entries under `src/content/notation/`.
- Page-only meanings are schema-checked `notation.local` frontmatter.
- A lesson imports shared meanings explicitly through `notation.uses`; local
  entries are automatically in that lesson's scope.
- Authors write `\term\{key\}` in MDX prose (MDX consumes the brace escapes) and
  `\term{key}` in shared `.md` bodies. Inside `$…$` / `$$…$$`, ordinary LaTeX is
  written and each identifier is resolved from scope; `\explain{key}{latex}` is
  the escape hatch when scope is ambiguous or the glyph is non-canonical.
- Resolution is lexical: page-local first, then `notation.uses`. Raw-glyph
  lookup and "most recently defined" are never used. More than one candidate for
  an identifier is a build error.
- A deterministic in-memory registry validates keys, references, imports,
  cycles, curriculum alignment, and review state, and derives page bundles and
  backlinks.
- KaTeX renders HTML + MathML at build time. Its trust callback accepts exactly
  one validated `data-notation-key` emitted by `\explain`; author-written
  `\htmlData`, MathJax, CDNs, and remote scripts are rejected.
- Every notation-enabled page carries a static `<details>` disclosure of its
  resolved definitions; the shared glossary is built from the same collection.
  A browser adapter may highlight, position, focus, and pin an explanation, but
  does not render math, resolve scope, mutate definitions, or calculate. With
  JavaScript disabled the equations, MathML, disclosure, links, and glossary
  still work.

### Completeness gate

Every identifier in a lesson's rendered mathematics must resolve to a semantic
key. `remarkNotation` classifies identifier atoms against operators using
KaTeX's MathML and fails the build on an unresolved identifier, printing its
`file:line` and token. Operators, digits, delimiters, primes, and the
differential `d` are exempt.

## Why

Raw glyph lookup is ambiguous: `r`, `P`, `t`, even `D(0,t)` mean different things
under different products. Inline explanation dictionaries duplicate content,
bypass review metadata, and vanish without JavaScript. A semantic registry lets
an editor review a reused meaning, its units, sources, and curriculum home once,
while each equation chooses the visual token it annotates. Explicit imports make
lesson scope reviewable and cheap to validate. Build-time rendering preserves
the static architecture and leaves real HTML, MathML, and links when JavaScript
is unavailable. A completeness gate turns "is every symbol explained?" from a
repeated review chore into a build check.

## Accepted, not yet built

- A repository-owned **base notation library** of universal quantities (circle
  constant, Euler's number, the imaginary unit, `\exp`, `\ln`, expectation,
  probability, the indicator, a generic summation index), in every lesson's
  scope automatically.
- A per-lesson **resolution report** (symbol, key, resolving level, source span)
  written as a checked snapshot for the quantitative reviewer.

## Rejected

Superseding the former ADR 0003, these are **not** part of the design:

- Inline `\def{glyph}{key}{summary}` and section-scoped `\let{glyph}{key}`.
- `\group{expr}{key}` / `\underbrace…` sub-expression binding and the
  `:::equation{explains: key}` block attribute.
- A multi-level resolution ladder beyond "page-local, then `notation.uses`".
- The dev-only authoring overlay.
- The reader-facing per-key mute list.
- `notation.reusedGlyphs` and a one-glyph-two-meanings warning.

They add markup, scope machinery, and reader-facing state that no lesson has
needed. If a future lesson genuinely requires sub-expression explanation or
section-scoped glyph reuse, reopen this ADR with that lesson as the motivating
case.

Also rejected earlier and still rejected: raw-LaTeX lookup, inline JavaScript
dictionaries, runtime MathJax from a CDN, and deriving scope from competencies
alone.

## Consequences

Editors create or reuse a definition before referencing it and keep
`notation.uses` synchronized. A glyph change does not change the semantic key; a
meaning change usually does. The compiler parses notation references, classifies
math atoms, detects conflicts and cycles, enforces alignment and review-state
rules, and builds page bundles. AI-authored notation entries and materially
changed lessons stay `draft` and need human source, pedagogy, quantitative, and
accessibility review.
