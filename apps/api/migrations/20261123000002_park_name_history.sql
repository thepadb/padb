-- A Park's Name History, replaced whole whenever a save changes it. See ADR 0012

CREATE TABLE park_name_history (
    park_id uuid NOT NULL REFERENCES park (id) ON DELETE CASCADE,
    -- Ordered by position, not by date. See ADR 0010
    position integer NOT NULL,
    name text NOT NULL,
    -- The Partial Date the name was first used, as its first possible day and precision. See ADR 0010
    first_used_on date,
    first_used_precision date_precision,

    PRIMARY KEY (park_id, position),
    CONSTRAINT park_name_history_position_not_negative CHECK (position >= 0),
    -- Any whitespace, not only spaces as btrim strips, matching the API's check
    CONSTRAINT park_name_history_name_not_blank CHECK (name ~ '\S'),
    CONSTRAINT park_name_history_first_used_known_together CHECK (
        (first_used_on IS NULL) = (first_used_precision IS NULL)
    ),
    CONSTRAINT park_name_history_first_used_year_canonical CHECK (
        first_used_precision <> 'year' OR (extract(month FROM first_used_on) = 1 AND extract(day FROM first_used_on) = 1)
    ),
    CONSTRAINT park_name_history_first_used_month_canonical CHECK (
        first_used_precision <> 'month' OR extract(day FROM first_used_on) = 1
    )
);
