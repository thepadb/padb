-- A Park's Status History, replaced whole whenever a save changes it. See ADR 0012

CREATE TYPE status AS ENUM (
    'announced', 'under_construction', 'operating', 'refurbishing', 'sbno', 'closed', 'demolished', 'relocated'
);

-- How much of a Partial Date is known. See ADR 0010
CREATE TYPE date_precision AS ENUM ('year', 'month', 'day');

CREATE TABLE park_status_history (
    park_id uuid NOT NULL REFERENCES park (id) ON DELETE CASCADE,
    -- Ordered by position, not by date. See ADR 0010
    position integer NOT NULL,
    status status NOT NULL,
    -- The Partial Date the Status began, as its first possible day and precision. See ADR 0010
    began_on date,
    began_precision date_precision,

    PRIMARY KEY (park_id, position),
    CONSTRAINT park_status_history_position_not_negative CHECK (position >= 0),
    CONSTRAINT park_status_history_began_known_together CHECK ((began_on IS NULL) = (began_precision IS NULL)),
    CONSTRAINT park_status_history_began_year_canonical CHECK (
        began_precision <> 'year' OR (extract(month FROM began_on) = 1 AND extract(day FROM began_on) = 1)
    ),
    CONSTRAINT park_status_history_began_month_canonical CHECK (
        began_precision <> 'month' OR extract(day FROM began_on) = 1
    )
);
