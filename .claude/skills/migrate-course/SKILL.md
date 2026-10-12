---
name: migrate-course
description: Upgrade a downstream explico course to a newer engine version — record the old version, install the new one, apply exactly the migration sections between them with `content migrate`, verify. Use when asked to update, upgrade or migrate a course's explico dependency, including a PATCH.
---

# Upgrade a course's engine

Every `explico` bump is a migration task, PATCH included: each release has a
section in the shipped `docs/authoring/migrating.md` that either gives exact
work or says no course changes are required.

1. Record the installed version: `node -p "require('explico/package.json').version"`.
2. `pnpm add explico@<version>` — without `-D`, so pnpm updates whichever block
   already lists `explico`.
3. `pnpm content migrate` prints exactly the sections to apply, from the
   version `package.json` pinned at HEAD to the one now installed, oldest
   first (`--from`/`--to` override either end), and refuses when a section is
   missing. Apply every one: required and conditional changes across
   `content/`, `content/course.config.ts`, Astro/source wiring, course scripts,
   dependencies and generated files. Do not use `CHANGELOG.md` alone as the
   procedure, and do not assume a release without a **Breaking** heading
   needs no work. If `pnpm content migrate` is not a verb yet (a course
   whose `scripts/content.ts` predates the shim), read the sections from
   `node_modules/explico/docs/authoring/migrating.md`; the section that
   introduced the shim says how to switch to it.
4. The checks each section ends with, then: `pnpm validate:content` (passes on
   its first run; commit `content/versions.json` if it changed),
   `pnpm content check --changed`, `astro check`, `astro build`, and the
   course's browser tests if it has any.
5. Commit the dependency change, the migration edits and the generated files
   together, naming the versions in the message.
