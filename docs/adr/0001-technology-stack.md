# ADR 0001: Content-first static architecture

- Status: accepted
- Date: 2026-08-27

## Decision

Use Astro/Starlight with MDX, React islands, pure TypeScript domain models,
KaTeX, Observable Plot, Vitest, and Playwright. Keep the first deployment
static and learner progress local.

## Why

The project is primarily reviewed educational content with isolated interactive
models. Static rendering minimizes operational and security surface while
islands keep labs possible. Pure domain modules keep financial behavior
independently testable and portable.

## Consequences

Editors work in Git-authored MDX and JSON. Astro and React introduce two
component models, but only developers building labs need both. Authentication,
live market data, and synchronized progress are deferred.
