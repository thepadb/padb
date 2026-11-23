//! Updating a Park through the internal API and reading it through the public API.

mod common;

use axum::http::StatusCode;
use common::{
    StoredRevision, Write, break_writes_to, feed_entries, get_json, patch_json, post_json,
    revisions,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

/// Creates Alton Towers in GB, returning its ID.
async fn create(db: &PgPool) -> String {
    let body = json!({ "name": "Alton Towers", "country": "GB" });
    let (status, park) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::CREATED);
    park["id"].as_str().unwrap().to_owned()
}

async fn update(db: &PgPool, id: &str, body: Value) -> (StatusCode, Value) {
    patch_json(
        padb_api::internal_router(db.clone()),
        &format!("/parks/{id}"),
        &body,
    )
    .await
}

async fn read(db: &PgPool, id: &str) -> Value {
    let (status, park) = get_json(
        padb_api::public_router(db.clone()),
        &format!("/v1/parks/{id}"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    park
}

#[sqlx::test]
async fn updated_park_is_readable(db: PgPool) {
    let id = create(&db).await;

    let (status, updated) = update(
        &db,
        &id,
        json!({ "name": "Alton Towers Resort", "country": "IE" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let park = read(&db, &id).await;
    assert_eq!(
        park,
        json!({ "id": id, "name": "Alton Towers Resort", "country": "IE", "resort": null, "status_history": [], "name_history": [] })
    );
    assert_eq!(updated, park);
}

#[sqlx::test]
async fn updating_an_unknown_park_is_not_found(db: PgPool) {
    let (status, error) = update(
        &db,
        &Uuid::now_v7().to_string(),
        json!({ "name": "Alton Towers" }),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(error["error"].is_string());
}

/// Every Revision after the one that created the Park, oldest first.
async fn revisions_after_creation(db: &PgPool) -> Vec<StoredRevision> {
    revisions(db).await.into_iter().skip(1).collect()
}

/// Every Change Feed entry after the one for creating the Park, oldest first.
async fn feed_entries_after_creation(db: &PgPool) -> Vec<(String, Uuid)> {
    feed_entries(db).await.into_iter().skip(1).collect()
}

#[sqlx::test]
async fn updating_writes_one_revision_of_only_the_changed_fields_and_one_change(db: PgPool) {
    let id = create(&db).await;

    // Country is sent but unchanged, so the Revision leaves it out
    let (status, _) = update(
        &db,
        &id,
        json!({ "name": "Alton Towers Resort", "country": "GB" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    assert_eq!(
        revisions_after_creation(&db).await,
        vec![StoredRevision::accepted_system_park(
            Uuid::parse_str(&id).unwrap(),
            json!({ "name": { "from": "Alton Towers", "to": "Alton Towers Resort" } })
        )]
    );
    assert_eq!(
        feed_entries_after_creation(&db).await,
        vec![("park".to_owned(), Uuid::parse_str(&id).unwrap())]
    );
}

#[sqlx::test]
async fn revision_holds_every_changed_field(db: PgPool) {
    let id = create(&db).await;

    let (status, _) = update(&db, &id, json!({ "name": "Tayto Park", "country": "IE" })).await;
    assert_eq!(status, StatusCode::OK);

    assert_eq!(
        revisions_after_creation(&db).await,
        vec![StoredRevision::accepted_system_park(
            Uuid::parse_str(&id).unwrap(),
            json!({
                "name": { "from": "Alton Towers", "to": "Tayto Park" },
                "country": { "from": "GB", "to": "IE" },
            })
        )]
    );
}

/// Asserts the save is refused, the Park keeps its values and nothing is written.
async fn assert_refused(db: &PgPool, id: &str, body: Value) {
    let (status, error) = update(db, id, body.clone()).await;
    assert_eq!(
        status,
        StatusCode::UNPROCESSABLE_ENTITY,
        "{body} was not refused"
    );
    assert!(error["error"].is_string(), "{body} gave no error message");
    assert_unchanged(db, id, &format!("{body} was refused")).await;
}

async fn assert_unchanged(db: &PgPool, id: &str, after: &str) {
    assert_eq!(
        read(db, id).await,
        json!({ "id": id, "name": "Alton Towers", "country": "GB", "resort": null, "status_history": [], "name_history": [] }),
        "Park changed after {after}"
    );
    assert!(
        revisions_after_creation(db).await.is_empty(),
        "Revision written after {after}"
    );
    assert!(
        feed_entries_after_creation(db).await.is_empty(),
        "Change Feed entry written after {after}"
    );
}

#[sqlx::test]
async fn a_save_that_changes_nothing_is_refused(db: PgPool) {
    let id = create(&db).await;
    for body in [
        json!({}),
        json!({ "name": "Alton Towers" }),
        json!({ "name": "Alton Towers", "country": "GB" }),
    ] {
        assert_refused(&db, &id, body).await;
    }
}

#[sqlx::test]
async fn null_fields_are_refused(db: PgPool) {
    let id = create(&db).await;
    // Null is not a field left out: it must not let the other field save alone
    for (body, message) in [
        (
            json!({ "name": null, "country": "IE" }),
            "name: invalid type: null, expected a string",
        ),
        (
            json!({ "name": "Tayto Park", "country": null }),
            "country: invalid type: null, expected a string",
        ),
    ] {
        let (_, error) = update(&db, &id, body.clone()).await;
        assert_eq!(error, json!({ "error": message }), "{body}");
        assert_refused(&db, &id, body).await;
    }
}

#[sqlx::test]
async fn blank_names_are_refused(db: PgPool) {
    let id = create(&db).await;
    for name in ["", "   ", "\t\n"] {
        assert_refused(&db, &id, json!({ "name": name })).await;
    }
}

#[sqlx::test]
async fn invalid_country_codes_are_refused(db: PgPool) {
    let id = create(&db).await;
    // Lowercase, too short, too long, alpha-3, numeric, and well-formed but unassigned
    for country in ["gb", "G", "GBR", "826", "", "XX", "UK"] {
        assert_refused(
            &db,
            &id,
            json!({ "name": "Tayto Park", "country": country }),
        )
        .await;
    }
}

async fn assert_failed_save_writes_nothing(db: PgPool, write: Write, broken: &str) {
    let id = create(&db).await;
    break_writes_to(&db, write, broken).await;
    let (status, _) = update(&db, &id, json!({ "name": "Tayto Park", "country": "IE" })).await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_unchanged(&db, &id, &format!("{broken} failed")).await;
}

#[sqlx::test]
async fn nothing_is_written_when_the_park_fails(db: PgPool) {
    assert_failed_save_writes_nothing(db, Write::Update, "park").await;
}

#[sqlx::test]
async fn nothing_is_written_when_the_revision_fails(db: PgPool) {
    assert_failed_save_writes_nothing(db, Write::Insert, "revision").await;
}

#[sqlx::test]
async fn nothing_is_written_when_the_change_fails(db: PgPool) {
    assert_failed_save_writes_nothing(db, Write::Insert, "change").await;
}

#[sqlx::test]
async fn updates_are_not_reachable_on_the_public_router(db: PgPool) {
    let id = create(&db).await;
    for uri in [format!("/parks/{id}"), format!("/v1/parks/{id}")] {
        let (status, _) = patch_json(
            padb_api::public_router(db.clone()),
            &uri,
            &json!({ "name": "Tayto Park" }),
        )
        .await;
        assert!(
            status == StatusCode::NOT_FOUND || status == StatusCode::METHOD_NOT_ALLOWED,
            "PATCH {uri} answered {status} on the public router"
        );
    }
    assert_unchanged(&db, &id, "PATCH on the public router").await;
}

#[sqlx::test]
async fn unknown_fields_are_refused(db: PgPool) {
    let id = create(&db).await;
    // A misspelt name must not let the country save without it
    assert_refused(&db, &id, json!({ "nmae": "Tayto Park", "country": "IE" })).await;
}
