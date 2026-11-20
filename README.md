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

## Licensing

* **Code:** [AGPL-3.0](LICENSE). If you run a modified version as a service, you must publish your source.
* **Data:** [ODbL 1.0](DATA_LICENSE). If you use the data, you must credit PADB and share any improved database under the same licence.

## Contributing

See [CONTRIBUTING](https://github.com/thepadb/.github/blob/main/CONTRIBUTING.md).
