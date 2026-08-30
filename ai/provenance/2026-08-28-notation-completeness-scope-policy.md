# AI provenance: notation completeness and scoped-binding policy

- Date: 2026-08-28
- Model/tool: Anthropic Claude (Claude Code, Sonnet 5)
- Prompt-template version: ad hoc repository policy task; no reusable prompt
  template
- Registered source IDs supplied: none; the work records repository-local
  architecture and authoring policy and adds no financial claims
- Repository context reviewed: `README.md`, `AGENTS.md`, `AI_POLICY.md`,
  `CONTENT_STANDARD.md`, `docs/architecture.md`, `docs/notation-and-units.md`,
  `docs/adr/0001-technology-stack.md`, `docs/adr/0002-notation-authoring.md`,
  `NOTATION_ARCHITECTURE.md`, `src/content.config.ts`,
  `scripts/notation-files.ts`, the `src/components/notation/` components, and
  the shared `src/content/notation/` entries
- Files affected: `docs/adr/0003-notation-completeness-and-scoped-binding.md`
  (new), `docs/adr/0002-notation-authoring.md` (status and pointer),
  `docs/architecture.md`, `docs/notation-and-units.md`, `CONTENT_STANDARD.md`,
  `AGENTS.md`, `AI_POLICY.md`, `NOTATION_ARCHITECTURE.md`
- Independent recalculation: not applicable; no numerical answer, formula, or
  golden value was changed
- Automated checks: `pnpm validate:content` and `pnpm format:check` re-run
  after the edits; see the handoff notes for results
- Human checks completed: none claimed
- Human checks pending: confirmation that the adopted design matches the
  intended toolchain direction, that ADR 0003 correctly scopes what it
  supersedes in ADR 0002, quantitative-review sign-off on the completeness gate
  and sub-expression rules, and accessibility review of the reader mute list
  and the authoring overlay

No source citation, reviewer identity, hidden reasoning, credential, private
data, or licensed material was added.
