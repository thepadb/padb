//! The database refuses blank names, even when the API is bypassed, by the same rule as the API: any whitespace counts as blank.

use sqlx::PgPool;

/// Blank names as SQL literals: empty, spaces, and tabs and newlines, which btrim would not strip.
const BLANK: [&str; 3] = ["''", "' '", r"E'\t\n'"];

fn refused(result: Result<sqlx::postgres::PgQueryResult, sqlx::Error>) -> bool {
    matches!(result, Err(sqlx::Error::Database(error)) if error.is_check_violation())
}

#[sqlx::test]
async fn blank_park_names_are_refused(db: PgPool) {
    for name in BLANK {
        let sql = format!("INSERT INTO park (name, country) VALUES ({name}, 'GB')");
        let result = sqlx::query(sqlx::AssertSqlSafe(sql)).execute(&db).await;
        assert!(refused(result), "{name}");
    }
}

#[sqlx::test]
async fn blank_names_are_refused_in_name_history(db: PgPool) {
    let park: (uuid::Uuid,) = sqlx::query_as(
        "INSERT INTO park (name, country) VALUES ('Alton Towers', 'GB') RETURNING id",
    )
    .fetch_one(&db)
    .await
    .unwrap();
    for name in BLANK {
        let sql = format!(
            "INSERT INTO park_name_history (park_id, position, name) VALUES ($1, 0, {name})"
        );
        let result = sqlx::query(sqlx::AssertSqlSafe(sql))
            .bind(park.0)
            .execute(&db)
            .await;
        assert!(refused(result), "{name}");
    }
}
