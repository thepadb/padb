# Parks & Attractions Database (PADB)

An open, community-edited database of parks, rides and attractions, with a public API.

> **Status:** early planning. Nothing is usable yet.

## Goals

* Structured data on parks, areas, rides, manufacturers, ride models and operators
* Full history: openings, closures, renames and rethemes
* Anyone can create an account and contribute edits
* A free public API for developers

## Stack (planned)

| Part | Tech |
|---|---|
| Website | [TanStack Start](https://tanstack.com/start) (TypeScript) |
| API | Rust |
| Database | PostgreSQL |
| API docs | Generated from an OpenAPI spec, served by the API |

## Repository layout (planned)

```
apps/
  api/        Rust API
  website/    TanStack Start site
packages/     Shared code (e.g. generated API client)
docs/         Project and agent docs
```

## Running locally

### Prerequisites

* [Rust](https://rustup.rs) (stable; `rust-toolchain.toml` pulls in clippy and rustfmt)
* [Node.js](https://nodejs.org) (version in `.node-version`) and [pnpm](https://pnpm.io/installation) (version pinned in `package.json`)
* [just](https://just.systems)
* [Docker](https://docs.docker.com/get-docker/) with Compose; on macOS without Docker Desktop: `brew install colima docker docker-compose` then `colima start --vm-type vz --vz-rosetta` (the PostGIS image is amd64-only)
* [sqlx-cli](https://crates.io/crates/sqlx-cli) for migrations: `cargo install sqlx-cli --no-default-features --features rustls,postgres`

### Commands

```sh
just install   # install JS dependencies
just serve     # start local Postgres (PostGIS image) on localhost:5432
just migrate   # apply database migrations
just api       # run the API: public on port 3000, internal on localhost:3001
just website   # run the website on localhost:3100
just lint      # rustfmt, clippy, Biome and TypeScript
just format    # fix formatting
just test      # run all tests
just down      # stop local services
just cleanup 7 # delete a merged issue's worktree and branch
```

Both API ports answer `GET /health`. Set `PUBLIC_ADDR` (default `0.0.0.0:3000`) or `INTERNAL_ADDR` (default `127.0.0.1:3001`) to move them; keep the internal API off any public network (ADR 0014). `just` points `DATABASE_URL` at the local database from `compose.yaml`; set it yourself to use another. If port 5432 is taken, set `DB_PORT` (e.g. `DB_PORT=55432 just serve`) and keep it set for later commands.

## Licensing

* **Code:** [AGPL-3.0](LICENSE). If you run a modified version as a service, you must publish your source.
* **Data:** [ODbL 1.0](DATA_LICENSE). If you use the data, you must credit PADB and share any improved database under the same licence.

## Contributing

See [CONTRIBUTING](https://github.com/thepadb/.github/blob/main/CONTRIBUTING.md).
