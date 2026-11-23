//! Saving a Park's Name History, with Partial Dates, and reading it back. See ADR 0010 and ADR 0012

mod common;

use axum::http::StatusCode;
use common::{StoredRevision, Write, break_writes_to, get_json, patch_json, post_json, revisions};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

/// Creates Alton Towers in GB with `name_history`, returning its ID.
async fn create(db: &PgPool, name_history: Value) -> String {
    let body = json!({ "name": "Alton Towers", "country": "GB", "name_history": name_history });
    let (status, park) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::CREATED, "{park}");
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

async fn name_history(db: &PgPool, id: &str) -> Value {
    let (status, park) = get_json(
        padb_api::public_router(db.clone()),
        &format!("/v1/parks/{id}"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    park["name_history"].clone()
}

#[sqlx::test]
async fn name_history_is_returned_in_the_saved_order_even_when_dates_are_not(db: PgPool) {
    // Out of date order on purpose: order is by position, never by date. See ADR 0010
    let history = json!([
        { "name": "Alton Towers Resort", "first_used": "2024-03-16" },
        { "name": "Alton Park", "first_used": "1924" },
        { "name": "Alton Towers Gardens", "first_used": "1980-04" },
    ]);
    let id = create(&db, history.clone()).await;
    assert_eq!(name_history(&db, &id).await, history);
}

#[sqlx::test]
async fn partial_dates_are_returned_unpadded_or_null_when_unknown(db: PgPool) {
    let history = json!([
        { "name": "Alton Gardens", "first_used": null },
        { "name": "Alton Park", "first_used": "1924" },
        { "name": "Alton Towers Gardens", "first_used": "1980-04" },
        { "name": "Alton Towers Resort", "first_used": "1996-11-06" },
    ]);
    let id = create(&db, history.clone()).await;
    assert_eq!(name_history(&db, &id).await, history);
}

#[sqlx::test]
async fn a_left_out_date_is_unknown(db: PgPool) {
    let id = create(&db, json!([{ "name": "Alton Park" }])).await;
    assert_eq!(
        name_history(&db, &id).await,
        json!([{ "name": "Alton Park", "first_used": null }])
    );
}

#[sqlx::test]
async fn a_park_created_without_name_history_has_none(db: PgPool) {
    let body = json!({ "name": "Alton Towers", "country": "GB" });
    let (status, park) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(park["name_history"], json!([]));
}

#[sqlx::test]
async fn creating_returns_the_name_history_as_read(db: PgPool) {
    let body = json!({
        "name": "Alton Towers",
        "country": "GB",
        "name_history": [{ "name": "Alton Park", "first_used": "1924" }],
    });
    let (_, created) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    let id = created["id"].as_str().unwrap();
    assert_eq!(created["name_history"], name_history(&db, id).await);
}

#[sqlx::test]
async fn name_history_and_status_history_are_saved_together(db: PgPool) {
    let names = json!([{ "name": "Alton Park", "first_used": "1924" }]);
    let statuses = json!([{ "status": "operating", "began": "1980" }]);
    let body = json!({
        "name": "Alton Towers",
        "country": "GB",
        "name_history": names,
        "status_history": statuses,
    });
    let (status, created) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::CREATED, "{created}");
    assert_eq!(created["name_history"], names);
    assert_eq!(created["status_history"], statuses);
}

#[sqlx::test]
async fn inserting_an_entry_in_the_middle_renumbers_it(db: PgPool) {
    let id = create(
        &db,
        json!([
            { "name": "Alton Park", "first_used": "1924" },
            { "name": "Alton Towers Resort", "first_used": "1996" },
        ]),
    )
    .await;

    let history = json!([
        { "name": "Alton Park", "first_used": "1924" },
        { "name": "Alton Towers Gardens", "first_used": "1980" },
        { "name": "Alton Towers Resort", "first_used": "1996" },
    ]);
    let (status, updated) = update(&db, &id, json!({ "name_history": history })).await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    assert_eq!(updated["name_history"], history);
    assert_eq!(name_history(&db, &id).await, history);
    assert_eq!(stored_positions(&db, &id).await, vec![0, 1, 2]);
    // Only the new entry, not every entry after it
    assert_eq!(
        revisions(&db).await[1].changes,
        json!({ "name_history": {
            "added": [{ "position": 1, "name": "Alton Towers Gardens", "first_used": "1980" }],
        } })
    );
}

/// The positions the Park `id`'s Name History is stored at, in order.
async fn stored_positions(db: &PgPool, id: &str) -> Vec<i32> {
    sqlx::query_scalar(
        "SELECT position FROM park_name_history WHERE park_id = $1::uuid ORDER BY position",
    )
    .bind(id)
    .fetch_all(db)
    .await
    .unwrap()
}

#[sqlx::test]
async fn name_history_can_be_emptied(db: PgPool) {
    let id = create(&db, json!([{ "name": "Alton Park", "first_used": "1924" }])).await;
    let (status, _) = update(&db, &id, json!({ "name_history": [] })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(name_history(&db, &id).await, json!([]));
}

#[sqlx::test]
async fn leaving_name_history_out_of_an_update_keeps_it(db: PgPool) {
    let history = json!([{ "name": "Alton Park", "first_used": "1924" }]);
    let id = create(&db, history.clone()).await;
    let (status, updated) = update(
        &db,
        &id,
        json!({ "status_history": [{ "status": "operating" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["name_history"], history);
    assert_eq!(name_history(&db, &id).await, history);
}

#[sqlx::test]
async fn parks_are_listed_with_their_name_history(db: PgPool) {
    let first = json!([{ "name": "Alton Park", "first_used": "1924" }]);
    let second = json!([
        { "name": "Tayto Park", "first_used": "2010" },
        { "name": "Emerald Park", "first_used": null },
    ]);
    create(&db, first.clone()).await;
    create(&db, second.clone()).await;
    let (status, page) = get_json(padb_api::public_router(db.clone()), "/v1/parks").await;
    assert_eq!(status, StatusCode::OK);
    let histories: Vec<&Value> = page["parks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|park| &park["name_history"])
        .collect();
    assert_eq!(histories, vec![&first, &second]);
}

#[sqlx::test]
async fn creating_records_every_entry_as_added(db: PgPool) {
    let id = create(
        &db,
        json!([
            { "name": "Alton Park", "first_used": "1924" },
            { "name": "Alton Towers Gardens", "first_used": null },
        ]),
    )
    .await;
    assert_eq!(
        revisions(&db).await[0].changes["name_history"],
        json!({
            "added": [
                { "position": 0, "name": "Alton Park", "first_used": "1924" },
                { "position": 1, "name": "Alton Towers Gardens", "first_used": null },
            ]
        }),
        "Park {id}"
    );
}

#[sqlx::test]
async fn creating_without_name_history_records_none(db: PgPool) {
    create(&db, json!([])).await;
    assert!(
        revisions(&db).await[0]
            .changes
            .get("name_history")
            .is_none()
    );
}

#[sqlx::test]
async fn the_revision_lists_added_removed_and_changed_entries(db: PgPool) {
    let id = create(
        &db,
        json!([
            { "name": "Alton Park", "first_used": "1924" },
            { "name": "Alton Towers Gardens", "first_used": "1980" },
            { "name": "Alton Towers Resort", "first_used": "1996" },
        ]),
    )
    .await;

    // Position 0 is kept, 1 changes its date, 2 is removed
    let (status, _) = update(
        &db,
        &id,
        json!({ "name_history": [
            { "name": "Alton Park", "first_used": "1924" },
            { "name": "Alton Towers Gardens", "first_used": "1980-04-04" },
        ] }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Position 2 is added back with no date
    let (status, _) = update(
        &db,
        &id,
        json!({ "name_history": [
            { "name": "Alton Park", "first_used": "1924" },
            { "name": "Alton Towers Gardens", "first_used": "1980-04-04" },
            { "name": "The Alton Towers Resort" },
        ] }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let park = Uuid::parse_str(&id).unwrap();
    assert_eq!(
        revisions(&db).await[1..],
        [
            StoredRevision::accepted_system_park(
                park,
                json!({ "name_history": {
                    "removed": [{ "position": 2, "name": "Alton Towers Resort", "first_used": "1996" }],
                    "changed": [{
                        "position": 1,
                        "from": { "name": "Alton Towers Gardens", "first_used": "1980" },
                        "to": { "name": "Alton Towers Gardens", "first_used": "1980-04-04" },
                    }],
                } })
            ),
            StoredRevision::accepted_system_park(
                park,
                json!({ "name_history": {
                    "added": [{ "position": 2, "name": "The Alton Towers Resort", "first_used": null }],
                } })
            ),
        ]
    );
}

#[sqlx::test]
async fn sending_the_same_name_history_changes_nothing(db: PgPool) {
    let history = json!([{ "name": "Alton Park", "first_used": "1924" }]);
    let id = create(&db, history.clone()).await;
    let (status, _) = update(&db, &id, json!({ "name_history": history })).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(revisions(&db).await.len(), 1);
}

#[sqlx::test]
async fn blank_names_are_refused(db: PgPool) {
    let history = json!([{ "name": "Alton Park", "first_used": "1924" }]);
    let id = create(&db, history.clone()).await;
    for name in ["", " ", "\t\n"] {
        let entries = json!([{ "name": name, "first_used": "1924" }]);
        let (status, error) = update(&db, &id, json!({ "name_history": entries })).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY, "{name:?}");
        assert_eq!(
            error,
            json!({ "error": "name_history[0].name: A name in a Name History cannot be blank" }),
            "{name:?}"
        );
    }
    let body =
        json!({ "name": "Alton Towers", "country": "GB", "name_history": [{ "name": " " }] });
    let (status, _) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(name_history(&db, &id).await, history);
    assert_eq!(revisions(&db).await.len(), 1);
}

#[sqlx::test]
async fn unreadable_name_history_is_refused(db: PgPool) {
    let history = json!([{ "name": "Alton Park", "first_used": "1924" }]);
    let id = create(&db, history.clone()).await;
    for (entries, message) in [
        (
            json!(null),
            "name_history: invalid type: null, expected a sequence",
        ),
        (
            json!([{ "first_used": "1924" }]),
            "name_history[0]: missing field `name`",
        ),
        (
            json!([{ "name": "Alton Park", "used": "1924" }]),
            "name_history[0].used: unknown field `used`, expected `name` or `first_used`",
        ),
        (
            json!([{ "name": "Alton Park", "first_used": "1924-4" }]),
            "name_history[0].first_used: \"1924-4\" is not a Partial Date: use YYYY, YYYY-MM or YYYY-MM-DD",
        ),
    ] {
        let (status, error) = update(&db, &id, json!({ "name_history": entries })).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY, "{entries}");
        assert_eq!(error, json!({ "error": message }), "{entries}");
    }
    assert_eq!(name_history(&db, &id).await, history);
    assert_eq!(revisions(&db).await.len(), 1);
}

#[sqlx::test]
async fn nothing_is_written_when_the_name_history_fails(db: PgPool) {
    let history = json!([{ "name": "Alton Park", "first_used": "1924" }]);
    let id = create(&db, history.clone()).await;
    break_writes_to(&db, Write::Insert, "park_name_history").await;
    let (status, _) = update(
        &db,
        &id,
        json!({ "name": "Tayto Park", "name_history": [{ "name": "Alton Towers Resort" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(name_history(&db, &id).await, history);
    assert_eq!(revisions(&db).await.len(), 1);
}
