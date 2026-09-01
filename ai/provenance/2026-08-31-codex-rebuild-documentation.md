# AI provenance: repository inventory and rebuild prompts

- Date: 2026-08-31
- Tool: OpenAI Codex
- Prompt-template version: ad hoc human request; no approved reusable template
- Approved educational source IDs supplied: none
- Other evidence used: repository files at commit `fe3b0ab` and official OpenAI
  prompting guidance
- Affected files:
  - `docs/codex_repository_blueprint.md`
  - `docs/codex_rebuild_prompt_order.md`
  - this provenance record
- Scope: read-only implementation inventory, documentation-drift analysis,
  proposed lean architecture, test strategy, and ordered rebuild/authoring
  prompts
- Calculations or golden answers changed: none
- Content or domain implementation changed: none

## Automated checks

- Repository inventory was cross-checked against schemas, content, components,
  scripts, tests, configuration, and build files.
- Formatting and full `pnpm verify` are to be run after the documentation edit.

## Human checks pending

- [ ] Confirm the implemented/partial/planned/legacy feature classifications.
- [ ] Approve or revise the target architecture and semantic math syntax.
- [ ] Approve the proposed dependency/toolchain choices before a new repository
      is scaffolded.
- [ ] Approve the prompt sequence and human decision gates.
- [ ] Confirm licenses, owners, review identity model, hosting, default branch,
      and learner-progress scope.
- [ ] Confirm that no current draft content or numerical answer is treated as a
      reviewed source of truth during migration.
