-- Contributors and the system Contributor that skeleton saves are made as.

CREATE TYPE role AS ENUM ('contributor', 'trusted_contributor', 'moderator', 'admin');

-- See ADR 0013
CREATE TABLE contributor (
    -- See ADR 0008
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    -- Better Auth's user ID; null only for the system Contributor
    auth_user_id text UNIQUE,
    username text NOT NULL UNIQUE,
    role role NOT NULL DEFAULT 'contributor',
    -- Null while in review. See ADR 0013
    review_passed_at timestamptz,
    banned_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Authors saves no person made (the skeleton, imports); past review, so its Revisions are accepted automatically
INSERT INTO contributor (id, username, review_passed_at)
VALUES ('00000000-0000-7000-8000-000000000001', 'system', now());
