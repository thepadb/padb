-- A Park's Areas, saved by ID with its Park: updated, inserted or deleted. See ADR 0012
CREATE TABLE area (
    -- See ADR 0008
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    park_id uuid NOT NULL REFERENCES park (id) ON DELETE CASCADE,
    -- Original Name
    name text NOT NULL,

    -- Any whitespace, not only spaces as btrim strips, matching the API's check
    CONSTRAINT area_name_not_blank CHECK (name ~ '\S')
);

CREATE INDEX area_park_id_idx ON area (park_id);
