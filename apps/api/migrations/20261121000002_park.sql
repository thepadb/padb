-- Record types that have Revisions and Change Feed entries; grows as each kind is added.
CREATE TYPE record_type AS ENUM ('park');

CREATE TABLE park (
    -- See ADR 0008
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    -- Original Name
    name text NOT NULL,
    -- ISO 3166-1 alpha-2. See ADR 0009
    country char(2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT park_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT park_country_is_alpha_2 CHECK (country ~ '^[A-Z]{2}$')
);

CREATE INDEX park_country_idx ON park (country);
