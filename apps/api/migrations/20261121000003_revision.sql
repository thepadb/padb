-- See ADR 0012
CREATE TABLE revision (
    -- See ADR 0008
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    record_type record_type NOT NULL,
    -- No foreign key: a Revision outlives the record it created if that is Rejected or Deleted
    record_id uuid NOT NULL,
    contributor_id uuid NOT NULL REFERENCES contributor (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    schema_version integer NOT NULL,
    -- Only the fields that changed, each as { "from": ..., "to": ... }
    changes jsonb NOT NULL,
    -- Null when accepted automatically
    accepted_by uuid REFERENCES contributor (id),
    accepted_at timestamptz,
    rejected_by uuid REFERENCES contributor (id),
    rejected_at timestamptz,
    -- Public
    rejected_reason text,
    superseded_fields text[] NOT NULL DEFAULT '{}',

    CONSTRAINT revision_schema_version_positive CHECK (schema_version > 0),
    CONSTRAINT revision_changes_is_object CHECK (jsonb_typeof(changes) = 'object'),
    -- Review states. See ADR 0012
    CONSTRAINT revision_accepted_by_needs_accepted_at CHECK (accepted_by IS NULL OR accepted_at IS NOT NULL),
    CONSTRAINT revision_rejection_complete CHECK ((rejected_by IS NULL) = (rejected_at IS NULL)),
    CONSTRAINT revision_rejected_reason_needs_rejection CHECK (rejected_reason IS NULL OR rejected_at IS NOT NULL),
    CONSTRAINT revision_rejected_not_before_accepted CHECK (
        rejected_at IS NULL OR accepted_at IS NULL OR rejected_at >= accepted_at
    ),
    CONSTRAINT revision_superseded_needs_acceptance CHECK (cardinality(superseded_fields) = 0 OR accepted_at IS NOT NULL)
);

CREATE INDEX revision_record_idx ON revision (record_type, record_id, created_at);
