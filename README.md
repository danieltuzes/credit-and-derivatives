# credit-and-derivatives

A prerequisite-aware course in quantitative finance — discounting, bonds, credit
and CDS, derivatives and options — published as a static site and built as
machine-validated content.

**This is the first course built on the [`explico`](https://github.com/danieltuzes/explico)
engine.** `explico` turns a folder of MDX lessons and JSON collections into a
validated static course: one content model, a semantic notation / citation /
equation system with a completeness gate, and a deterministic JSON manifest.
This repo is the `content/` + course config + wiring; the engine is a
dependency (`explico` on npm).

Rendered site: **<https://danieltuzes.github.io/credit-and-derivatives/>**

> Educational use only. Nothing here is investment, legal, tax, accounting,
> valuation, or trading advice. See [`DISCLAIMER.md`](DISCLAIMER.md).

All content is verified against the standard in
[`docs/architecture.md` §2](docs/architecture.md): every worked number comes from
reviewed code or a cited source; conventions are consistent across lessons.

## Quick start

Requirements: **Node.js `24.20.0`** (one exact version across [`.nvmrc`](.nvmrc),
[`.node-version`](.node-version), `package.json` `engines`, and the CI / deploy
workflows; [`.npmrc`](.npmrc) sets `engine-strict`), **pnpm `11.24.0`** (pinned
by `packageManager`), and Playwright's Chromium for the browser checks.

```bash
# 1. pnpm — standalone install bundles its own Node, so it works with no system Node:
curl -fsSL https://get.pnpm.io/install.sh | sh -   # or: brew install pnpm

# 2. Node 24.20.0 — any .nvmrc-aware manager works (nvm/fnm/mise: `nvm install`),
#    or let pnpm manage it (writes a `node` shim onto PATH via $PNPM_HOME):
pnpm env use --global 24.20.0     # nudges toward `pnpm runtime set node 24.20.0 -g`; both work

# 3. project:
pnpm install
pnpm exec playwright install chromium
pnpm verify      # run before requesting review
pnpm dev         # http://localhost:4321
```

If `node` is installed but not found, ensure `$PNPM_HOME` (or your version
manager's shim dir) is on `PATH` for **non-interactive** shells too — a stock
`~/.bashrc` returns early before its pnpm block runs, so tools and agents that
spawn non-interactive shells won't see it. A symlink in `~/.local/bin` (already
on `PATH`) is the simplest fix.

## Commands

| Command                             | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `pnpm dev`                          | Editor preview with hot reload            |
| `pnpm validate:content`             | Curriculum + notation semantic validation |
| `pnpm check`                        | Astro + TypeScript checks                 |
| `pnpm test` / `pnpm test:watch`     | Numerical, curriculum, notation tests     |
| `pnpm test:e2e`                     | Astro server + browser + accessibility    |
| `pnpm build` / `pnpm preview`       | Static production build / preview it      |
| `pnpm format` / `pnpm format:check` | Prettier write / check                    |
| `pnpm verify`                       | Every required pre-review check, in order |

## Repository map

The build-time engine is the [`explico`](https://github.com/danieltuzes/explico)
package (a dependency). This repo is the course: `content/` + the config and
wiring that hand it to the engine. `tests/unit/boundaries.test.ts` keeps the
course side of that seam honest — `content/domain/` stays framework-free,
`content/course.config.ts` stays a plain data module, `src/content.config.ts`
only re-exports the engine.

| Path                                                 | Purpose                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `content/docs/`                                      | MDX lessons and site pages                                            |
| `content/{competencies,assessments,tracks,sources}/` | Curriculum data (JSON)                                                |
| `content/notation/`                                  | Shared define-once notation entries (Markdown)                        |
| `content/domain/`                                    | Pure financial and mathematical calculations (this course)            |
| `content/labs/`                                      | The course's interactive React explorers                              |
| `content/course.config.ts`                           | Course identity: title, sidebar sections, domains, conventions        |
| `src/content.config.ts`                              | Astro's content entry — re-exports the engine's Zod schemas           |
| `astro.config.mjs`, `scripts/`                       | The wiring layer: pass `courseConfig` + the manifest to the engine    |
| `build/`                                             | Compiled course output: `manifest.json` (git-ignored) + `resolution/` |
| `tests/`                                             | Unit, property, curriculum, browser, accessibility tests              |
| `docs/`                                              | Architecture reference and ADRs                                       |
| `reference-library/`                                 | Local (git-ignored) cache of source texts for verification            |

## Where things are documented

- **[`docs/architecture.md`](docs/architecture.md)** — the single reference: the
  pipeline, every boundary, the content model, the notation and citation
  mechanisms, the validation gates, and where each rule is enforced. The engine
  internals it describes now live in the `explico` repo; this repo owns the
  content model's use and the course wiring.
- **[`AGENTS.md`](AGENTS.md)** — task routing and non-negotiable rules for AI
  contributors.
- **[`AI_POLICY.md`](AI_POLICY.md)** — the enforceable AI policy.
- **[`docs/adr/`](docs/adr/)** — records of irreversible decisions.

## Owner decisions still open

Before accepting outside contributions or deploying broadly: choose code and
content licenses, add real `.github/CODEOWNERS` and branch protection, and decide
how reviewer identity and dates are stored.
