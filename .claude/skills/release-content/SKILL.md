---
name: release-content
description: Cut a course content release (rules C1–C3, C5) — move content/CHANGELOG.md's Unreleased section to a dated heading and bump about.version together. Use when asked to release or publish a course's content version.
---

# Cut a content release

A course's content has its own version stream: `content/course.config.ts`
`about.version` (shown to readers in the About `[?]` panel) and
`content/CHANGELOG.md`, with rules C1–C3 in `docs/authoring/versioning.md` and
each page's own version in `content/versions.json` (rule C5).

1. Every change since the last release has a bullet under `## [Unreleased]`
   in `content/CHANGELOG.md` (rule C1). If one is missing, add it first.
2. Pick the bump (rule C2): MAJOR when a lesson, competency or notation key
   was removed or renamed or a stated outcome changed; MINOR for something
   new; PATCH for a fix or clarification.
3. From the course package: `pnpm release:content [major|minor|patch]`. It
   moves `[Unreleased]` to a dated `## [x.y.z]` heading and sets
   `about.version` to match in the same change (rule C3).
4. `pnpm validate:content`: no `knowledge-*` warning; it rewrites
   `content/versions.json` — commit that file with the release, never edit it
   by hand.
5. Commit the changelog, the config and `versions.json` together.
