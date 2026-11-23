//! Saving a Park's Status History, with Partial Dates, and reading it back. See ADR 0010 and ADR 0012

mod common;

use axum::http::StatusCode;
use common::{StoredRevision, Write, break_writes_to, get_json, patch_json, post_json, revisions};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

/// Creates Alton Towers in GB with `status_history`, returning its ID.
async fn create(db: &PgPool, status_history: Value) -> String {
    let body = json!({ "name": "Alton Towers", "country": "GB", "status_history": status_history });
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

async fn status_history(db: &PgPool, id: &str) -> Value {
    let (status, park) = get_json(
        padb_api::public_router(db.clone()),
        &format!("/v1/parks/{id}"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    park["status_history"].clone()
}

#[sqlx::test]
async fn status_history_is_returned_in_the_saved_order_even_when_dates_are_not(db: PgPool) {
    // Out of date order on purpose: order is by position, never by date. See ADR 0010
    let history = json!([
        { "status": "operating", "began": "2024-03-16" },
        { "status": "announced", "began": "1979" },
        { "status": "refurbishing", "began": "2022" },
        { "status": "operating", "began": "1980-04" },
    ]);
    let id = create(&db, history.clone()).await;
    assert_eq!(status_history(&db, &id).await, history);
}

#[sqlx::test]
async fn partial_dates_are_returned_unpadded_or_null_when_unknown(db: PgPool) {
    let history = json!([
        { "status": "announced", "began": null },
        { "status": "under_construction", "began": "2022" },
        { "status": "operating", "began": "2022-11" },
        { "status": "closed", "began": "2022-11-06" },
    ]);
    let id = create(&db, history.clone()).await;
    assert_eq!(status_history(&db, &id).await, history);
}

#[sqlx::test]
async fn a_left_out_date_is_unknown(db: PgPool) {
    let id = create(&db, json!([{ "status": "sbno" }])).await;
    assert_eq!(
        status_history(&db, &id).await,
        json!([{ "status": "sbno", "began": null }])
    );
}

#[sqlx::test]
async fn a_park_created_without_status_history_has_none(db: PgPool) {
    let body = json!({ "name": "Alton Towers", "country": "GB" });
    let (status, park) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(park["status_history"], json!([]));
}

#[sqlx::test]
async fn creating_returns_the_status_history_as_read(db: PgPool) {
    let body = json!({
        "name": "Alton Towers",
        "country": "GB",
        "status_history": [{ "status": "operating", "began": "1980" }],
    });
    let (_, created) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    let id = created["id"].as_str().unwrap();
    assert_eq!(created["status_history"], status_history(&db, id).await);
}

#[sqlx::test]
async fn inserting_an_entry_in_the_middle_renumbers_it(db: PgPool) {
    let id = create(
        &db,
        json!([
            { "status": "operating", "began": "1980" },
            { "status": "operating", "began": "2024" },
        ]),
    )
    .await;

    let history = json!([
        { "status": "operating", "began": "1980" },
        { "status": "refurbishing", "began": "2022" },
        { "status": "operating", "began": "2024" },
    ]);
    let (status, updated) = update(&db, &id, json!({ "status_history": history })).await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    assert_eq!(updated["status_history"], history);
    assert_eq!(status_history(&db, &id).await, history);
    assert_eq!(stored_positions(&db, &id).await, vec![0, 1, 2]);
    // Only the new entry, not every entry after it
    assert_eq!(
        revisions(&db).await[1].changes,
        json!({ "status_history": {
            "added": [{ "position": 1, "status": "refurbishing", "began": "2022" }],
        } })
    );
}

#[sqlx::test]
async fn removing_an_entry_from_the_middle_records_only_that_entry(db: PgPool) {
    let id = create(
        &db,
        json!([
            { "status": "operating", "began": "1980" },
            { "status": "refurbishing", "began": "2022" },
            { "status": "operating", "began": "2024" },
        ]),
    )
    .await;

    let history = json!([
        { "status": "operating", "began": "1980" },
        { "status": "operating", "began": "2024" },
    ]);
    let (status, _) = update(&db, &id, json!({ "status_history": history })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(status_history(&db, &id).await, history);
    assert_eq!(stored_positions(&db, &id).await, vec![0, 1]);
    assert_eq!(
        revisions(&db).await[1].changes,
        json!({ "status_history": {
            "removed": [{ "position": 1, "status": "refurbishing", "began": "2022" }],
        } })
    );
}

/// The positions the Park `id`'s Status History is stored at, in order.
async fn stored_positions(db: &PgPool, id: &str) -> Vec<i32> {
    sqlx::query_scalar(
        "SELECT position FROM park_status_history WHERE park_id = $1::uuid ORDER BY position",
    )
    .bind(id)
    .fetch_all(db)
    .await
    .unwrap()
}

#[sqlx::test]
async fn status_history_can_be_emptied(db: PgPool) {
    let id = create(&db, json!([{ "status": "operating", "began": "1980" }])).await;
    let (status, _) = update(&db, &id, json!({ "status_history": [] })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(status_history(&db, &id).await, json!([]));
}

#[sqlx::test]
async fn leaving_status_history_out_of_an_update_keeps_it(db: PgPool) {
    let history = json!([{ "status": "operating", "began": "1980" }]);
    let id = create(&db, history.clone()).await;
    let (status, updated) = update(&db, &id, json!({ "name": "Alton Towers Resort" })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["status_history"], history);
    assert_eq!(status_history(&db, &id).await, history);
}

#[sqlx::test]
async fn parks_are_listed_with_their_status_history(db: PgPool) {
    let first = json!([{ "status": "operating", "began": "1980" }]);
    let second = json!([
        { "status": "closed", "began": "2007-10-02" },
        { "status": "demolished", "began": null },
    ]);
    create(&db, first.clone()).await;
    create(&db, second.clone()).await;
    let (status, page) = get_json(padb_api::public_router(db.clone()), "/v1/parks").await;
    assert_eq!(status, StatusCode::OK);
    let histories: Vec<&Value> = page["parks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|park| &park["status_history"])
        .collect();
    assert_eq!(histories, vec![&first, &second]);
}

#[sqlx::test]
async fn creating_records_every_entry_as_added(db: PgPool) {
    let id = create(
        &db,
        json!([
            { "status": "announced", "began": "1979" },
            { "status": "operating", "began": null },
        ]),
    )
    .await;
    assert_eq!(
        revisions(&db).await[0].changes["status_history"],
        json!({
            "added": [
                { "position": 0, "status": "announced", "began": "1979" },
                { "position": 1, "status": "operating", "began": null },
            ]
        }),
        "Park {id}"
    );
}

#[sqlx::test]
async fn creating_without_status_history_records_none(db: PgPool) {
    create(&db, json!([])).await;
    assert!(
        revisions(&db).await[0]
            .changes
            .get("status_history")
            .is_none()
    );
}

#[sqlx::test]
async fn the_revision_lists_added_removed_and_changed_entries(db: PgPool) {
    let id = create(
        &db,
        json!([
            { "status": "announced", "began": "1979" },
            { "status": "operating", "began": "1980" },
            { "status": "closed", "began": "2007" },
        ]),
    )
    .await;

    // Position 0 is kept, 1 changes its date, 2 is removed
    let (status, _) = update(
        &db,
        &id,
        json!({ "status_history": [
            { "status": "announced", "began": "1979" },
            { "status": "operating", "began": "1980-04-04" },
        ] }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Position 2 is added back with no date
    let (status, _) = update(
        &db,
        &id,
        json!({ "status_history": [
            { "status": "announced", "began": "1979" },
            { "status": "operating", "began": "1980-04-04" },
            { "status": "sbno" },
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
                json!({ "status_history": {
                    "removed": [{ "position": 2, "status": "closed", "began": "2007" }],
                    "changed": [{
                        "position": 1,
                        "from": { "status": "operating", "began": "1980" },
                        "to": { "status": "operating", "began": "1980-04-04" },
                    }],
                } })
            ),
            StoredRevision::accepted_system_park(
                park,
                json!({ "status_history": {
                    "added": [{ "position": 2, "status": "sbno", "began": null }],
                } })
            ),
        ]
    );
}

#[sqlx::test]
async fn sending_the_same_status_history_changes_nothing(db: PgPool) {
    let history = json!([{ "status": "operating", "began": "1980" }]);
    let id = create(&db, history.clone()).await;
    let (status, _) = update(&db, &id, json!({ "status_history": history })).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(revisions(&db).await.len(), 1);
}

#[sqlx::test]
async fn unreadable_status_history_is_refused(db: PgPool) {
    let history = json!([{ "status": "operating", "began": "1980" }]);
    let id = create(&db, history.clone()).await;
    for (entries, message) in [
        (
            json!(null),
            "status_history: invalid type: null, expected a sequence",
        ),
        (
            json!([{ "status": "open" }]),
            "status_history[0].status: unknown variant `open`, expected one of `announced`, `under_construction`, `operating`, `refurbishing`, `sbno`, `closed`, `demolished`, `relocated`",
        ),
        (
            json!([{ "began": "1980" }]),
            "status_history[0]: missing field `status`",
        ),
        (
            json!([{ "status": "operating", "begun": "1980" }]),
            "status_history[0].begun: unknown field `begun`, expected `status` or `began`",
        ),
    ] {
        let (status, error) = update(&db, &id, json!({ "status_history": entries })).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY, "{entries}");
        assert_eq!(error, json!({ "error": message }), "{entries}");
    }
    assert_eq!(status_history(&db, &id).await, history);
    assert_eq!(revisions(&db).await.len(), 1);
}

#[sqlx::test]
async fn malformed_partial_dates_are_refused(db: PgPool) {
    let history = json!([{ "status": "operating", "began": "1980" }]);
    let id = create(&db, history.clone()).await;
    // Padded or short parts, impossible months and days, year 0, times, and other separators
    for began in [
        "80",
        "1980-4",
        "1980-04-4",
        "01980",
        "0000",
        "1980-00",
        "1980-13",
        "1980-04-00",
        "1980-04-31",
        "1981-02-29",
        "1980-04-04T00:00",
        "1980/04",
        "",
        " 1980",
    ] {
        let entries = json!([{ "status": "operating", "began": began }]);
        let (status, error) = update(&db, &id, json!({ "status_history": entries })).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY, "{began:?}");
        assert_eq!(
            error["error"],
            format!(
                "status_history[0].began: {began:?} is not a Partial Date: use YYYY, YYYY-MM or YYYY-MM-DD"
            ),
            "{began:?}"
        );
    }
    assert_eq!(status_history(&db, &id).await, history);
}

#[sqlx::test]
async fn leap_days_are_partial_dates(db: PgPool) {
    let history = json!([
        { "status": "operating", "began": "2024-02-29" },
        { "status": "closed", "began": "2000-02-29" },
    ]);
    let id = create(&db, history.clone()).await;
    assert_eq!(status_history(&db, &id).await, history);
}

#[sqlx::test]
async fn nothing_is_written_when_the_status_history_fails(db: PgPool) {
    let history = json!([{ "status": "operating", "began": "1980" }]);
    let id = create(&db, history.clone()).await;
    break_writes_to(&db, Write::Insert, "park_status_history").await;
    let (status, _) = update(
        &db,
        &id,
        json!({ "name": "Tayto Park", "status_history": [{ "status": "closed" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(status_history(&db, &id).await, history);
    assert_eq!(revisions(&db).await.len(), 1);
}
