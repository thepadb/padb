# Duplicates are merged, not deleted; every ID keeps answering

Consumers store our IDs, so an ID must never silently stop working. Duplicates are Merged by a Moderator or Admin: the duplicate's ID permanently points to the surviving record. Only Admins can Delete, and only for records that should never have existed (spam, legal takedown, personal data); a deleted ID reports the record as gone rather than unknown, so consumers can tell deliberate removal from a broken link. A Delete is a Rejection of the record's creation plus erasing the content of its Revisions; there is no tombstone table (ADR 0012).

Redirects never chain: when a record is Merged, any IDs already pointing at it are repointed to the new survivor, so every lookup is at most one hop and loops are impossible.

A Merge can be undone. The duplicate's data is kept, hidden, rather than discarded; undoing restores it and removes its redirect. Each Merge records which child records (e.g. a duplicate Park's rides) it moved to the survivor, so undoing moves exactly those back. Edits made to the survivor after the Merge stay with the survivor.

The API answers a merged ID with a `301` to the survivor, sent with `Cache-Control: max-age=86400` so an undone Merge reaches clients within a day, and the survivor lists the IDs merged into it (`merged_ids`), so consumers can update the IDs they store.
