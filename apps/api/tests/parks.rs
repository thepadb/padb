//! Creating a Park through the internal API and reading it through the public API.

mod common;

use axum::http::StatusCode;
use common::{get_json, post_json};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

async fn create(db: &PgPool, body: Value) -> (StatusCode, Value) {
    post_json(padb_api::internal_router(db.clone()), "/parks", &body).await
}

async fn assert_nothing_saved(db: &PgPool, after: &str) {
    for table in ["park", "revision", "change"] {
        assert_eq!(count(db, table).await, 0, "{table} has rows after {after}");
    }
}

async fn count(db: &PgPool, table: &str) -> i64 {
    sqlx::query_scalar(sqlx::AssertSqlSafe(format!("SELECT count(*) FROM {table}")))
        .fetch_one(db)
        .await
        .unwrap()
}

#[sqlx::test]
async fn created_park_is_readable_with_no_resort(db: PgPool) {
    let (status, created) = create(&db, json!({ "name": "Alton Towers", "country": "GB" })).await;
    assert_eq!(status, StatusCode::CREATED);
    let id = created["id"].as_str().unwrap();
    assert_eq!(Uuid::parse_str(id).unwrap().get_version_num(), 7);

    let (status, park) = get_json(padb_api::public_router(db), &format!("/v1/parks/{id}")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        park,
        json!({ "id": id, "name": "Alton Towers", "country": "GB", "resort": null })
    );
    assert_eq!(created, park);
}

#[sqlx::test]
async fn unknown_park_is_not_found(db: PgPool) {
    let (status, _) = get_json(
        padb_api::public_router(db),
        &format!("/v1/parks/{}", Uuid::now_v7()),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test]
async fn malformed_park_id_is_a_client_error(db: PgPool) {
    let (status, _) = get_json(padb_api::public_router(db), "/v1/parks/not-a-uuid").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[derive(Debug, PartialEq, sqlx::FromRow)]
struct StoredRevision {
    record_type: String,
    record_id: Uuid,
    schema_version: i32,
    changes: Value,
    accepted: bool,
    accepted_by: Option<Uuid>,
    rejected: bool,
}

#[sqlx::test]
async fn creating_a_park_writes_one_accepted_revision_and_one_change(db: PgPool) {
    let (_, created) = create(&db, json!({ "name": "Alton Towers", "country": "GB" })).await;
    let id = Uuid::parse_str(created["id"].as_str().unwrap()).unwrap();

    let revisions: Vec<StoredRevision> = sqlx::query_as(
        "SELECT record_type::text, record_id, schema_version, changes, accepted_at IS NOT NULL AS accepted,
             accepted_by, rejected_at IS NOT NULL AS rejected
         FROM revision",
    )
    .fetch_all(&db)
    .await
    .unwrap();
    assert_eq!(
        revisions,
        vec![StoredRevision {
            record_type: "park".to_owned(),
            record_id: id,
            schema_version: 1,
            changes: json!({
                "name": { "from": null, "to": "Alton Towers" },
                "country": { "from": null, "to": "GB" },
            }),
            accepted: true,
            accepted_by: None,
            rejected: false,
        }]
    );

    let changes: Vec<(String, Uuid)> =
        sqlx::query_as("SELECT record_type::text, record_id FROM change")
            .fetch_all(&db)
            .await
            .unwrap();
    assert_eq!(changes, vec![("park".to_owned(), id)]);
}

#[sqlx::test]
async fn revision_is_made_by_the_system_contributor(db: PgPool) {
    create(&db, json!({ "name": "Alton Towers", "country": "GB" })).await;
    let username: String = sqlx::query_scalar(
        "SELECT c.username FROM revision r JOIN contributor c ON c.id = r.contributor_id",
    )
    .fetch_one(&db)
    .await
    .unwrap();
    assert_eq!(username, "system");
}

/// Makes every insert into `table` fail, standing in for any part of a save going wrong.
async fn break_inserts_into(db: &PgPool, table: &str) {
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
        "CREATE FUNCTION fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'broken'; END $$;
         CREATE TRIGGER broken BEFORE INSERT ON {table} FOR EACH ROW EXECUTE FUNCTION fail();"
    )))
    .execute(db)
    .await
    .unwrap();
}

async fn assert_failed_save_writes_nothing(db: PgPool, broken: &str) {
    break_inserts_into(&db, broken).await;
    let (status, _) = create(&db, json!({ "name": "Alton Towers", "country": "GB" })).await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_nothing_saved(&db, &format!("{broken} failed")).await;
}

#[sqlx::test]
async fn nothing_is_written_when_the_park_fails(db: PgPool) {
    assert_failed_save_writes_nothing(db, "park").await;
}

#[sqlx::test]
async fn nothing_is_written_when_the_revision_fails(db: PgPool) {
    assert_failed_save_writes_nothing(db, "revision").await;
}

#[sqlx::test]
async fn nothing_is_written_when_the_change_fails(db: PgPool) {
    assert_failed_save_writes_nothing(db, "change").await;
}

async fn assert_refused(db: &PgPool, body: Value) {
    let (status, error) = create(db, body.clone()).await;
    assert_eq!(
        status,
        StatusCode::UNPROCESSABLE_ENTITY,
        "{body} was not refused"
    );
    assert!(error["error"].is_string(), "{body} gave no error message");
    assert_nothing_saved(db, &format!("{body} was refused")).await;
}

#[sqlx::test]
async fn blank_names_are_refused(db: PgPool) {
    for name in ["", "   ", "\t\n"] {
        assert_refused(&db, json!({ "name": name, "country": "GB" })).await;
    }
}

#[sqlx::test]
async fn invalid_country_codes_are_refused(db: PgPool) {
    // Lowercase, too short, too long, alpha-3, numeric, and well-formed but unassigned
    for country in ["gb", "G", "GBR", "826", "", "XX", "UK"] {
        assert_refused(&db, json!({ "name": "Alton Towers", "country": country })).await;
    }
}

#[sqlx::test]
async fn names_are_saved_as_entered(db: PgPool) {
    let (_, created) = create(&db, json!({ "name": " Alton Towers ", "country": "GB" })).await;
    assert_eq!(created["name"], " Alton Towers ");
}

#[sqlx::test]
async fn write_routes_are_not_reachable_on_the_public_router(db: PgPool) {
    let body = json!({ "name": "Alton Towers", "country": "GB" });
    for uri in ["/parks", "/v1/parks"] {
        let (status, _) = post_json(padb_api::public_router(db.clone()), uri, &body).await;
        assert!(
            status == StatusCode::NOT_FOUND || status == StatusCode::METHOD_NOT_ALLOWED,
            "POST {uri} answered {status} on the public router"
        );
    }
    assert_eq!(count(&db, "park").await, 0);
}
