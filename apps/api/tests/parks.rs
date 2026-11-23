//! Creating a Park through the internal API and reading it through the public API.

mod common;

use axum::http::StatusCode;
use common::{
    StoredRevision, Write, break_writes_to, feed_entries, get_json, post_json, revisions,
};
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
        json!({ "id": id, "name": "Alton Towers", "country": "GB", "resort": null, "status_history": [], "name_history": [] })
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

#[sqlx::test]
async fn creating_a_park_writes_one_accepted_system_revision_and_one_change(db: PgPool) {
    let (_, created) = create(&db, json!({ "name": "Alton Towers", "country": "GB" })).await;
    let id = Uuid::parse_str(created["id"].as_str().unwrap()).unwrap();

    assert_eq!(
        revisions(&db).await,
        vec![StoredRevision::accepted_system_park(
            id,
            json!({
                "name": { "from": null, "to": "Alton Towers" },
                "country": { "from": null, "to": "GB" },
            })
        )]
    );
    assert_eq!(feed_entries(&db).await, vec![("park".to_owned(), id)]);
}

async fn assert_failed_save_writes_nothing(db: PgPool, broken: &str) {
    break_writes_to(&db, Write::Insert, broken).await;
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
async fn unknown_fields_are_refused(db: PgPool) {
    assert_refused(
        &db,
        json!({ "name": "Alton Towers", "country": "GB", "contry": "IE" }),
    )
    .await;
}

#[sqlx::test]
async fn refusals_say_what_is_wrong_in_plain_words(db: PgPool) {
    for (body, message) in [
        (
            json!({ "name": " ", "country": "GB" }),
            "name: A Park needs a name",
        ),
        (
            json!({ "name": "Alton Towers", "country": "XX" }),
            r#"country: "XX" is not an ISO 3166-1 alpha-2 country code"#,
        ),
        (
            json!({ "name": "Alton Towers", "country": "GB", "contry": "IE" }),
            "contry: unknown field `contry`, expected one of `name`, `country`, `status_history`, `name_history`",
        ),
        (json!({ "name": "Alton Towers" }), "missing field `country`"),
    ] {
        let (status, error) = create(&db, body.clone()).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY, "{body}");
        assert_eq!(error, json!({ "error": message }), "{body}");
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
