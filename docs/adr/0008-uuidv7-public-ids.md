# Public IDs are UUIDv7

Every record's public ID is a UUIDv7: opaque and safe to expose, yet time-ordered so database indexes stay efficient at scale, unlike random UUIDs. The API uses bare IDs; website URLs may append a cosmetic slug (`/rides/<id>-<name>`) that is ignored when resolving, so renames never break links.
