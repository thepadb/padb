-- The Change Feed: one row each time a public record changes, written in the same transaction. See ADR 0011
-- `id` is not yet a safe cursor: identity values can commit out of order, which the feed endpoint must handle.
CREATE TABLE change (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_type record_type NOT NULL,
    record_id uuid NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
