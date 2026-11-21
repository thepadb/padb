//! The database refuses every Revision review state outside ADR 0012's table, even when the API is bypassed.

use sqlx::PgPool;

const SYSTEM: &str = "'00000000-0000-7000-8000-000000000001'";

/// Inserts a Revision with the given review columns, returning whether the database accepted it.
async fn insert(db: &PgPool, columns: &str, values: &str) -> bool {
    let sql = format!(
        "INSERT INTO revision (record_type, record_id, contributor_id, schema_version, changes{columns})
         VALUES ('park', uuidv7(), {SYSTEM}, 1, '{{}}'{values})"
    );
    match sqlx::query(sqlx::AssertSqlSafe(sql)).execute(db).await {
        Ok(_) => true,
        Err(sqlx::Error::Database(error)) if error.is_check_violation() => false,
        Err(error) => panic!("unexpected error: {error}"),
    }
}

#[sqlx::test]
async fn allowed_states_are_stored(db: PgPool) {
    let allowed: [(&str, &str, &str); 8] = [
        ("Pending", "", ""),
        ("Accepted automatically", ", accepted_at", ", now()"),
        (
            "Accepted by someone",
            ", accepted_at, accepted_by",
            &format!(", now(), {SYSTEM}"),
        ),
        (
            "Rejected while Pending",
            ", rejected_at, rejected_by",
            &format!(", now(), {SYSTEM}"),
        ),
        (
            "Rejected while Pending, with a reason",
            ", rejected_at, rejected_by, rejected_reason",
            &format!(", now(), {SYSTEM}, 'spam'"),
        ),
        (
            "Accepted, later Rejected",
            ", accepted_at, rejected_at, rejected_by",
            &format!(", now() - interval '1 day', now(), {SYSTEM}"),
        ),
        (
            "Accepted and Rejected at once",
            ", accepted_at, rejected_at, rejected_by",
            &format!(", '2026-01-01', '2026-01-01', {SYSTEM}"),
        ),
        (
            "Accepted with Superseded fields",
            ", accepted_at, superseded_fields",
            ", now(), '{name}'",
        ),
    ];
    for (state, columns, values) in allowed {
        assert!(insert(&db, columns, values).await, "{state} was refused");
    }
}

#[sqlx::test]
async fn other_states_are_refused(db: PgPool) {
    let refused: [(&str, &str, &str); 6] = [
        (
            "Accepted by someone with no acceptance time",
            ", accepted_by",
            &format!(", {SYSTEM}"),
        ),
        (
            "Rejection time with no rejecter",
            ", rejected_at",
            ", now()",
        ),
        (
            "Rejecter with no rejection time",
            ", rejected_by",
            &format!(", {SYSTEM}"),
        ),
        ("Reason with no Rejection", ", rejected_reason", ", 'spam'"),
        (
            "Rejected before it was Accepted",
            ", accepted_at, rejected_at, rejected_by",
            &format!(", now(), now() - interval '1 day', {SYSTEM}"),
        ),
        (
            "Superseded fields while Pending",
            ", superseded_fields",
            ", '{name}'",
        ),
    ];
    for (state, columns, values) in refused {
        assert!(!insert(&db, columns, values).await, "{state} was stored");
    }
}
