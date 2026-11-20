# Single repo; the API is the only way to the data

The Rust API (`apps/api`) and the TanStack Start website (`apps/website`) live in one repo so a change to both lands in one commit, but they are separate apps. Only the API touches domain data; the website reads through the same public API as any other consumer, so the API is always complete and exercised, and writes through the internal API (ADR 0014). The website's own server functions handle web concerns only (accounts, sessions, rendering), never domain logic; its account tables live in their own schema (ADR 0013).
