# ADR 0004: Inline source citations

- Status: accepted; syntax refined 2026-09-02/03 (see Update)
- Date: 2026-08-31

## Update (post-decision)

The decision holds; two details changed. For the current form see
[`docs/architecture.md` §8](../architecture.md):

- The author syntax is `[@source-id]` / `[@source-id; locator]`, not
  `\cite\{source-id\}` / `\cite\{source-id\}\{locator\}` (D3b). Both are
  MDX-safe; the first `;` separates the id from the free-text locator.
- `CitationLayer` no longer carries its own copy of the panel logic or a
  serialized source blob — it and `NotationLayer` share the `createHoverPanel`
  primitive and read from the marker `data-*` plus the on-page `#cite-n` list
  (Phase E1).
- `source-id` resolves against `content/sources/*.json` (Phase F1).

## Decision

Add a citation layer that parallels the notation layer: an author marks a
claim in lesson prose, and the build renders a numbered marker plus a
reference list, with an optional hover panel over the same markup.

- Authors write `\cite\{source-id\}` in MDX prose, or
  `\cite\{source-id\}\{locator\}` when the locator is specific to that use
  (`§1.2, eqs. 1.1-1.3`). MDX removes the brace escapes, exactly as for
  `\term\{key\}`, and the `remarkCitation` adapter matches the parsed
  `\cite{id}{locator}` form.
- `source-id` resolves against `src/content/sources/*.json`, loaded once in
  `astro.config.mjs` and passed to the adapter. An unknown or malformed id
  fails the build, like an unknown notation key.
- Each distinct `(source-id, locator)` pair is numbered by first appearance on
  the page. The marker is an `<a class="citation-ref" href="#cite-n">[n]</a>`,
  shown as a superscript by CSS. The first marker for a number also carries
  `id="cite-ref-n"` as the back-reference target.
- After walking the tree the adapter appends a `## References` heading and an
  ordered list to the document. Each item is
  `Authors, Title (edition, year). Locator.` plus the source URL when present,
  the source record's editorial status when not `reviewed`, and a `↩`
  back-link. `src/reference/citation-format.mjs` holds the pure formatting and
  is shared with the panel island.
- `src/curriculum/validation.ts` requires every `sources:` frontmatter id to
  be cited at least once in the body and every cited id to appear in
  `sources:`. `scripts/curriculum-files.ts` now carries the lesson body so the
  validator can see the `\cite` calls.
- Starlight's single `Footer` slot renders `LessonFooter.astro`, which
  composes the existing notation layer, the new `CitationLayer` island, and
  the default footer. `CitationLayer` serializes the source records to a JSON
  script and adds a fixed hover/pin panel positioned within the article
  column.

## Why

Listing every source once at the foot of a lesson does not tell a reader which
sentence each source supports, and it does not survive a claim being moved or
cut. A numbered marker at the point of use is the ordinary academic
convention and keeps the supporting locator next to the claim.

Reusing the notation model keeps the pipeline consistent: a small escaped
author token, build-time resolution against a schema-checked collection, a
static accessible baseline (real anchor links to an on-page list), and a
browser layer that only adds convenience. With JavaScript disabled the marker
still jumps to the reference, which still names the source.

Per-citation locators were chosen over one number per source because a single
lesson routinely cites several sections of the same book; the source record's
own catalog `locator` stays as metadata and is not the per-use string.

## Consequences

- Authors must register a source and list it in `sources:` before citing it,
  and must cite every source they list. The two-way check trades some
  friction for keeping the bibliography and the prose in step.
- Locators are plain text only. Markdown or `$math$` inside the second brace
  group would be split by earlier remark plugins before `remarkCitation`
  runs, so the adapter normalizes whitespace and the author keeps locators to
  section and equation numbers, `Table`, and `Figure`.
- The reference list is content, not chrome: it renders inside
  `.sl-markdown-content`, gains a heading anchor, and appears in the page
  table of contents.
- `CitationLayer` carries a trimmed copy of the notation panel's positioning
  and pin logic. If a third consumer appears, extract a shared hover-panel
  helper.
- AI-assisted citations and the sources they point at stay `draft` until a
  human confirms the printed locators; the marker and list render regardless
  of review state, showing the `draft` badge.

## Alternatives rejected

- **Keep the trailing source list only:** does not attribute individual
  claims and rots when prose changes.
- **GFM `[^1]` footnotes:** not wired in this pipeline, mixes prose footnotes
  with citations, and gives no place for a structured source record or a
  hover panel.
- **One number per source, locator from the record:** loses the section
  precision that these lessons need, since one page cites several parts of
  one book.
- **A generated citations manifest like the notation registry:** more moving
  parts than a per-document remark pass needs; the adapter already owns
  numbering and list rendering for one file at a time.
- **Numbering from the `sources:` array order:** decouples the number from
  where the reader meets the claim; first-appearance order is the convention
  readers expect.
