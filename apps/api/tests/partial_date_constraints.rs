//! The database keeps Partial Dates in one canonical form, even when the API is bypassed. See ADR 0010

use sqlx::PgPool;

/// Inserts a Status History entry beginning on `began_on` at `began_precision` (SQL literals), returning whether the database accepted it.
async fn insert(db: &PgPool, began_on: &str, began_precision: &str) -> bool {
    let park: (uuid::Uuid,) = sqlx::query_as(
        "INSERT INTO park (name, country) VALUES ('Alton Towers', 'GB') RETURNING id",
    )
    .fetch_one(db)
    .await
    .unwrap();
    let sql = format!(
        "INSERT INTO park_status_history (park_id, position, status, began_on, began_precision)
         VALUES ($1, 0, 'operating', {began_on}, {began_precision})"
    );
    match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(park.0)
        .execute(db)
        .await
    {
        Ok(_) => true,
        Err(sqlx::Error::Database(error)) if error.is_check_violation() => false,
        Err(error) => panic!("unexpected error: {error}"),
    }
}

#[sqlx::test]
async fn canonical_partial_dates_are_stored(db: PgPool) {
    for (what, began_on, began_precision) in [
        ("Unknown", "NULL", "NULL"),
        ("A year", "'2022-01-01'", "'year'"),
        ("A month", "'2022-11-01'", "'month'"),
        ("A day", "'2022-11-06'", "'day'"),
        ("A day on the 1st", "'2022-01-01'", "'day'"),
    ] {
        assert!(
            insert(&db, began_on, began_precision).await,
            "{what} was refused"
        );
    }
}

#[sqlx::test]
async fn non_canonical_partial_dates_are_refused(db: PgPool) {
    for (what, began_on, began_precision) in [
        ("A year not on 1 January", "'2022-11-06'", "'year'"),
        (
            "A year on the 1st of another month",
            "'2022-11-01'",
            "'year'",
        ),
        ("A month not on the 1st", "'2022-11-06'", "'month'"),
        ("A date without a precision", "'2022-11-06'", "NULL"),
        ("A precision without a date", "NULL", "'day'"),
    ] {
        assert!(
            !insert(&db, began_on, began_precision).await,
            "{what} was stored"
        );
    }
}

#[sqlx::test]
async fn negative_positions_are_refused(db: PgPool) {
    let park: (uuid::Uuid,) = sqlx::query_as(
        "INSERT INTO park (name, country) VALUES ('Alton Towers', 'GB') RETURNING id",
    )
    .fetch_one(&db)
    .await
    .unwrap();
    let result = sqlx::query(
        "INSERT INTO park_status_history (park_id, position, status) VALUES ($1, -1, 'operating')",
    )
    .bind(park.0)
    .execute(&db)
    .await;
    assert!(matches!(result, Err(sqlx::Error::Database(error)) if error.is_check_violation()));
}
