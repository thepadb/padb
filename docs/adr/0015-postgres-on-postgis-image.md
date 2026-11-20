# PostgreSQL, run from the PostGIS image

The database is PostgreSQL, accessed from Rust through sqlx with compile-checked SQL and sqlx migrations; no ORM. Search uses Postgres full-text search and `pg_trgm` fuzzy matching.

We considered a newer multi-model database for its built-in fuzzy search, graph relations and Rust-native SDK, but rejected it as the store of record: its licence is not OSI open source, its ecosystem is small, it has had breaking changes between major versions, and its Dumps would only help mirrors running the same database. Postgres keeps self-hosting and contributing easy. A separate search index fed from Postgres can still be added later without touching the API.

Postgres runs from the `postgis/postgis` image from day one. Nothing changes until `CREATE EXTENSION postgis`, but swapping images later is the fiddly part; locations stay as plain `latitude`/`longitude` columns until spatial queries are needed, then become a single migration.
