# The public API is read-only; writes go through an internal API

One Rust binary serves two routers on two ports. The public router is read-only, reached at `api.thepadb.org`, and is the only one in the published OpenAPI docs. The internal router carries every write, listens only on the private container network so only the website can reach it, and still requires a Contributor's token, so even the website cannot write anonymously. Other apps cannot write; Contributors edit through the website.

The public API is versioned in the path (`/v1/...`); a breaking change goes to `/v2` while `/v1` keeps running for a published period. Lists use cursor pagination (`?after=<cursor>&limit=50`, each response returning the next cursor), not page numbers, so pages stay stable while edits land and deep pages cost the same as the first. Reads need no key, with per-IP rate limits; an optional free key gives higher limits and lets us contact or block heavy users.

We chose this over a single public API with documented writes because a read-only public surface is simpler to secure, rate-limit and support.
