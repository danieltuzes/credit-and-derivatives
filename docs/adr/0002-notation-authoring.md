# ADR 0002: Semantic notation authoring

- Status: accepted; syntax refined 2026-09-02/03, reopened for glosses
  2026-09-03 (see both Updates)
- Date: 2026-08-28; consolidated 2026-09-01 (folds in the former ADR 0003)

## Update (post-decision)

The semantic-key principle below is unchanged, but the surface syntax and the
scope model evolved after this ADR was written. For the current form see
[`docs/architecture.md` §7](../architecture.md):

- Prose / body references are `[[key]]`, not `\term\{key\}` / `\term{key}` (D3b).
- A page's scope is `notation.local` + the shared keys it names with `[[key]]` /
  `\explain` + the base library. `notation.uses` is retired (D3).
- Bare-LaTeX resolution is a flat one-meaning-per-glyph page lookup
  (`math-glyphs.mjs`), not the structural matcher this ADR implies (D4).
- The two "Accepted, not yet built" items — the base notation library and the
  per-lesson resolution report — are now built (D3, D6).
- Shared entries live under `content/notation/` (Phase F1), not
  `src/content/notation/`.

## Update — the two-tier vocabulary (D15, 2026-09-03)

The Rejected list below closes with "reopen this ADR with that lesson as the
motivating case." This is that reopening. The semantic-key principle, the trust
boundary, the completeness gate, and the no-JS baseline are all unchanged; what
changes is that the vocabulary now has **two tiers**.

- A **card** is what this ADR has always meant by a definition: a
  `content/notation/*.md` entry (or a `notation.local` entry) with a symbol,
  name, description, units, sources, curriculum alignment, and review state. It
  gets a glossary card and is a node in the curriculum graph.
- A **gloss** is declared on a card, in that card's `glosses:` frontmatter, and
  carries a symbol, a name, and optionally a bare units string. Nothing else:
  no description, no sources, no alignment, no review state, no glossary card.
  Its key is _derived_ as `<card key>.<slug(name)>`, never authored.

### The motivating case

`expectation` is the one entry in the corpus with a rigorous `formula`:

    \mathbb{E}[X]=\int_{\Omega} X(\omega)\,d\mathbb{P}(\omega)

That definition cannot be written without naming `X`, `\Omega`, `\omega`, and
a probability measure. Before this update the formula was invisible on the
glossary and its glyphs were inert, because there were only two ways to give a
letter a meaning and both were wrong for these letters: promote each to a full
card (a description, sources, a curriculum home, and a review obligation for
"ω, an outcome"), or leave the formula unexplained.

The second reason is stronger than the ergonomic one, and it is a build
failure, not a preference. A card that references another card drags it into
the lesson bundle of every lesson that uses the referrer. `expectation` is
introduced at position 1 of the `bond-derivatives-foundations` track;
`real-world-probability-measure` at position 6. Resolving the formula's
`\mathbb{P}` by _referencing_ that card makes every foundations lesson between
them fail `alignment-introduction` — the same failure already recorded as
`terminal-random-payoff → maturity-time`. **A letter a definition needs in
order to be stated is not a curriculum prerequisite**, and the registry is
right to refuse to pretend otherwise. Glosses exist so that distinction can be
expressed.

### What follows from it

- A gloss is not a definition record, not a reference target, and not a graph
  node. It creates **no** edge — that is the whole point, not an oversight.
- A card's `formula` resolves against an **entry-scoped** glyph table: the card,
  its glosses, and any card the formula names with `\explain{key}{latex}`, plus
  the base library (`reference/gloss.ts`). This is _narrower_ than what a card's
  body math still resolves against (the whole registry), and narrower than a
  lesson page's scope.
- `\explain{key}` in a formula widens that table without creating a reference
  edge, for the reason above. The key's existence is still checked
  (`gate-math.ts`), so a marker pointing at nothing is reported rather than
  silently falling through to an unresolved glyph.
- Promotion and demotion are the intended lifecycle, and they are cheap because
  a formula spells LaTeX and never a key. Promoting a gloss is: delete the gloss
  line, add `content/notation/<key>.md`. Nothing else in the corpus changes.
  `gloss-collides-with-card` (Tier 1) fails the build if both are left in place;
  `gloss-wants-promoting` and `card-wants-demoting` (Tier 3) name the drift in
  each direction.
- Rendering: the glossary shows `meaning`, then the resolved `formula`, then the
  body. A gloss has no card, so the gloss list under the formula is where its
  name lives with JavaScript off — the hover panel is enhancement over content
  that already reads. The panel gained a back stack and a breadcrumb; it bottoms
  out after one hop, because glosses terminate.
- `render-notation-math.ts` now admits exactly one marker attribute,
  `data-notation-key`, re-validated against `NOTATION_KEY_PATTERN` at the
  component boundary. It is deliberately as narrow as `trustNotationMarker`.

### Why this is narrower than what was rejected

The rejected `\def{glyph}{key}{summary}` was inline markup in prose and math,
carrying a summary, scoped to a section, with a companion `\let` for rebinding.
A gloss is frontmatter on the entry that needs it, carries a name and no prose,
is scoped to that one entry, and cannot be rebound. It adds one optional
frontmatter key and no author-facing syntax at all: the formula stays ordinary
LaTeX.

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
  (Reopened and _partly_ superseded 2026-09-03 — see the D15 update above. The
  need was real; the inline, summary-carrying, section-scoped form of it was
  not. Frontmatter `glosses:` on the entry replaces it.)
- `\group{expr}{key}` / `\underbrace…` sub-expression binding and the
  `:::equation{explains: key}` block attribute.
- A multi-level resolution ladder beyond "page-local, then `notation.uses`".
- The dev-only authoring overlay.
- The reader-facing per-key mute list.
- `notation.reusedGlyphs` and a one-glyph-two-meanings warning.

They add markup, scope machinery, and reader-facing state that no lesson has
needed. If a future lesson genuinely requires sub-expression explanation or
section-scoped glyph reuse, reopen this ADR with that lesson as the motivating
case. That happened once, for `expectation` (D15): the outcome was frontmatter
glosses, not inline markup, and the rest of the list stands.

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
