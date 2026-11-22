# AGENTS.md

Guidance for AI agents working in this repo.

## Project

Parks & Attractions Database (PADB): an open, community-edited database of parks, rides and attractions with a public API. See [README](README.md).

## Domain

* Use the terms in [GLOSSARY.md](GLOSSARY.md) exactly, in code and docs.
* Read [docs/adr/](docs/adr/) before changing anything they cover; record new hard-to-reverse decisions there.
* Where code is shaped by an ADR, add a one-line pointer comment (`-- See ADR 0012`, `// See ADR 0012`) rather than repeating the reasoning.

## Stack

* Website: TanStack Start (TypeScript) in `apps/website`, with Better Auth for accounts (ADR 0013)
* API: Rust in `apps/api`: axum, sqlx (compile-checked SQL and migrations, no ORM), utoipa for the OpenAPI spec
* Database: PostgreSQL on the `postgis/postgis` image (ADR 0015)
* API client: generated from the OpenAPI spec with openapi-typescript and openapi-fetch, in `packages/`
* Tooling: Cargo workspace, pnpm workspace, `just` for shared commands, Biome for JS/TS/JSON lint and format
* Deploys: GitHub Actions builds images, pushes to GHCR; Dokploy deploys them

Do not introduce other major dependencies without an issue agreeing the choice.

## Layout

```
apps/api        Rust API
apps/website    TanStack Start site
packages/       Shared code
docs/agents/    Docs for agents
```

## Git workflow

* Every change starts from a GitHub issue.
* Branch name: `<issue>-<short-slug>`, e.g. `12-park-schema`.
* Worktree name: `<issue>` only, e.g. `.claude/worktrees/12`, or `<issue>-prototype` for a prototype. Never put the slug in the worktree name; `just cleanup` relies on this.
* Commit messages: `<issue>: <summary under 80 chars>`, then a normal body.
* PR title: `<issue>: <title>`. Body must include `Closes #<issue>`.
* Merge by **rebase only**. Squash and merge commits are disabled. Keep history linear.
* Never commit directly to `main`.

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI, with native relationships (sub-issues, blocked by). Acceptance criteria must be verifiable locally. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels (role name = label string). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Licensing

* Code is AGPL-3.0, data is ODbL 1.0. Do not add dependencies with licences incompatible with AGPL-3.0.
* Do not import data from sources whose licence is incompatible with ODbL.
