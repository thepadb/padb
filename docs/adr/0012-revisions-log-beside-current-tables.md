# Current tables hold accepted data; Revisions are a typed log beside them

Each record type has ordinary tables holding only its current, accepted state (`park`, `area`, `park_status_history`...), so reads, filters and constraints are plain SQL. Every save also writes one row to a single `revision` table in the same transaction: one save of one record, including its Areas, with creation as the first Revision. We rejected event sourcing (Revisions as the only truth, tables rebuilt by replay) because every read model, migration and fix would have to replay history, and we rejected snapshot tables per record type because every schema change would be made twice.

`revision.changes` is JSONB holding only the fields that changed, each as `{ "from": ..., "to": ... }`; list fields hold `added`, `removed` and `changed` by ID. It is typed in Rust (one serde struct per record type, read through sqlx's `Json<T>`), never free-form, and carries a `schema_version` so old Revisions still decode after fields are renamed.

## Saving lists

Lists without their own IDs (Status History, Name History) are saved whole: the record's rows are deleted and the new list inserted, numbered by position, in one transaction. Areas have public IDs that Rides and consumers rely on, so they are updated by ID, with new ones inserted and removed ones deleted; an Area that still has Rides cannot be removed.

## Review states

State is derived from who accepted and rejected a Revision, not stored. CHECK constraints allow only these combinations:

| `accepted_at` | `rejected_at` | State |
|---|---|---|
| null | null | Pending |
| set | null | Accepted (`accepted_by` null means accepted automatically) |
| null | set | Rejected while Pending |
| set | set, not earlier | Accepted, later Rejected |

`rejected_by` and `rejected_at` are always set together, and `rejected_reason` is optional and public.

A Revision from a Contributor who has not passed review is Pending and changes nothing anyone else sees. Accepting applies it; any field a later Revision has already changed is skipped and listed in `superseded_fields`, but the Revision still counts as Accepted for its Contributor. A Moderator accepting a Pending Revision applies it even if a field has since been Locked.

Rejecting an Accepted Revision sets its fields back to their values before it, except fields a later Revision has since changed; other Revisions stand. No new Revision is written: the Revision is marked Rejected and the Change Feed records the record as changed (ADR 0011).

## Removed IDs

There is no tombstone table; the API works out what an ID means from what exists:

1. A current row: return it.
2. A Merge redirect: `301` to the survivor (ADR 0003).
3. Any Revision for the ID was ever Accepted: it was public once, so `410 Gone`, with the creation Revision's `rejected_at` as when it was removed.
4. Otherwise: `404`.

Rejecting an Accepted creation removes the record. An Admin Delete is the same Rejection plus erasing the content of every Revision of that record, so spam, legal takedowns and personal data leave only bare Revision rows.
