---
name: draft-lesson
description: Draft or revise an explico lesson with the content CLI doing the lookups — context, rules in effect, symbol lookup before declaring notation, equation and bindings probes before a build, check, the content changelog. Use when asked to write, extend or fix a lesson, a notation entry or an assessment.
---

# Draft a lesson

Read with the CLI, not by opening files; every verb prints a bounded digest
and `--json` for the whole. Run them from the course package (the directory
whose `package.json` has the `content` script); `pnpm content help` lists them.

1. **Scope.** `pnpm content context <lesson>`: the lesson plus exactly its
   notation, references, assumptions and sources (a new lesson:
   `pnpm content new lesson <id>` scaffolds it).
2. **Rules.** `pnpm content rules --element <prose,table,…>` lists only the
   rules this course has on, with enforcement and codes; `pnpm content rule
   <ID>` prints one whole, example included. A rule absent from the list is
   off: neither apply it nor flag it.
3. **Notation, one question per symbol: is it already defined?**
   `pnpm content symbol <latex>`. A card with this meaning exists → reference
   it: `[[key]]` once in prose, bare math after; `\explain{key}{…}` only for a
   compound or a colliding glyph. The letter already means something else in
   the course → `notation.local` on this lesson (a gloss, in a card's
   formula). Neither → a shared card (`pnpm content new term <key>`), so the
   next lesson references it instead of copying it. Use count plays no part.
4. **Math, while writing.** `pnpm content equation "<latex>" --lesson <id>`
   resolves one expression the way the gate will and exits 1 when the build
   would refuse it; `pnpm content bindings <lesson>` shows every span's
   bindings, unresolved glyphs and redundant wraps.
5. **Check.** `pnpm content check <lesson>` (schema, references, MDX → KaTeX;
   exits non-zero on an error), then `pnpm content diagnostics --lesson <id>`
   for the rest; the counts come first, the lines on request.
6. **Record.** A bullet under `## [Unreleased]` in `content/CHANGELOG.md`
   (rule C1); `pnpm validate:content` rewrites `content/versions.json`, which
   is committed with the change (rule C5). Guide-only rules (`enforcement
   guide`) have no check: before handing back, have the `rules-reviewer`
   agent review the lesson, or review the draft against them yourself.
