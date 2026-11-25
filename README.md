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
just install      # install JS dependencies and Playwright's Chromium
just serve        # start local Postgres (PostGIS image) on localhost:55432
just migrate      # apply database migrations
just prepare      # save the API's queries to .sqlx after changing any SQL
just api          # run the API: public on port 3000, internal on localhost:3001
just website      # run the website on localhost:3100
just generate     # regenerate packages/api-client from the running API's OpenAPI spec
just lint         # rustfmt, clippy, Biome and TypeScript
just format       # fix formatting
just test         # run all tests but the browser ones
just test-unit    # run the website's Vitest unit tests
just test-e2e     # run the website's Playwright and axe tests against their own API, website and database
just down         # stop local services
just docker-build # build the API and website images
just docker-up    # run both images against local Postgres
just docker-down  # stop the images and local Postgres
just cleanup 7    # delete a merged issue's worktree and branch
```

Both API ports answer `GET /health`. The public API serves its OpenAPI spec at `/openapi.json` and browsable docs at `/docs` (http://localhost:3000/docs). Writes go only to the internal API, e.g. `curl -X POST localhost:3001/parks -H 'content-type: application/json' -d '{"name":"Alton Towers","country":"GB"}'`; the Park's page is then at `http://localhost:3100/parks/<id>`. Change its name or country with `curl -X PATCH localhost:3001/parks/<id> -H 'content-type: application/json' -d '{"name":"Alton Towers Resort"}'`; fields left out keep their values, and a save that changes nothing is refused. Every Park is listed at http://localhost:3100/parks (`GET /v1/parks?country=GB&limit=50` on the API, paged with each response's `next` cursor as `?after=`). The website reads the public API at `API_URL` (default `http://localhost:3000`), as does `just generate`. `packages/api-client` pins TypeScript 5 only for openapi-typescript, which needs the compiler API that TypeScript 7 dropped; the website typechecks on 7.

The API's SQL is checked at compile time against the database at `DATABASE_URL`, so run `just serve` and `just migrate` before building it. Tests (`just test`) create a fresh database per test from the same server. Set `PUBLIC_ADDR` (default `0.0.0.0:3000`) or `INTERNAL_ADDR` (default `127.0.0.1:3001`) to move them; keep the internal API off any public network (ADR 0014). `just` points `DATABASE_URL` at the local database from `compose.yaml`; set it yourself to use another. The database listens on 55432 rather than Postgres's usual 5432, so a Postgres installed on the host can't answer in its place; `just serve` refuses to start if one is already on that port. To use another port, set `DB_PORT` (e.g. `DB_PORT=55433 just serve`) and keep it set for later commands.

### Images and staging

`apps/api/Dockerfile` and `apps/website/Dockerfile` build from the repo root and take all settings from environment variables: the API needs `DATABASE_URL` and applies migrations on start; the website needs `API_URL`. `just docker-up` runs them with the website on localhost:3100 and the public API on localhost:3000 (`WEBSITE_PORT` and `API_PORT` move them); the internal API is left on the Compose network, so reach it with `docker run --rm --network <project>_default curlimages/curl http://api:3001/health`. The API image builds with `SQLX_OFFLINE`, checking queries against `.sqlx`, which `just lint` keeps in step.

Each push to `main` runs CI, pushes both images to GHCR as `ghcr.io/thepadb/padb-{api,website}` tagged `staging` and the commit SHA, then calls the Dokploy deploy webhook in the `DOKPLOY_WEBHOOK_URL` repository secret to deploy https://staging.thepadb.org.

## Licensing

* **Code:** [AGPL-3.0](LICENSE). If you run a modified version as a service, you must publish your source.
* **Data:** [ODbL 1.0](DATA_LICENSE). If you use the data, you must credit PADB and share any improved database under the same licence.

## Contributing

See [CONTRIBUTING](https://github.com/thepadb/.github/blob/main/CONTRIBUTING.md).
