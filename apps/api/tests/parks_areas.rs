//! Saving a Park's Areas by ID and reading them back. See ADR 0012

mod common;

use axum::http::StatusCode;
use common::{StoredRevision, Write, break_writes_to, get_json, patch_json, post_json, revisions};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

/// Creates a Park called `name` in GB with `areas`, returning the Park as saved.
async fn create_named(db: &PgPool, name: &str, areas: Value) -> Value {
    let body = json!({ "name": name, "country": "GB", "areas": areas });
    let (status, park) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::CREATED, "{park}");
    park
}

/// Creates Alton Towers with `areas`, returning the Park as saved.
async fn create(db: &PgPool, areas: Value) -> Value {
    create_named(db, "Alton Towers", areas).await
}

async fn update(db: &PgPool, id: &Value, body: Value) -> (StatusCode, Value) {
    let id = id.as_str().unwrap();
    patch_json(
        padb_api::internal_router(db.clone()),
        &format!("/parks/{id}"),
        &body,
    )
    .await
}

async fn areas(db: &PgPool, id: &Value) -> Value {
    let id = id.as_str().unwrap();
    let (status, park) = get_json(
        padb_api::public_router(db.clone()),
        &format!("/v1/parks/{id}"),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{park}");
    park["areas"].clone()
}

/// The ID of the Area called `name` in `park`.
fn area_id(park: &Value, name: &str) -> Value {
    park["areas"]
        .as_array()
        .unwrap()
        .iter()
        .find(|area| area["name"] == name)
        .unwrap_or_else(|| panic!("no Area called {name} in {park}"))["id"]
        .clone()
}

#[sqlx::test]
async fn created_areas_get_uuidv7_ids_and_are_readable(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let id = area_id(&park, "Forbidden Valley");
    let uuid = Uuid::parse_str(id.as_str().unwrap()).unwrap();
    assert_eq!(uuid.get_version_num(), 7);
    assert_eq!(
        areas(&db, &park["id"]).await,
        json!([{ "id": id, "name": "Forbidden Valley" }])
    );
    assert_eq!(park["areas"], areas(&db, &park["id"]).await);
}

#[sqlx::test]
async fn a_park_saved_without_areas_has_none(db: PgPool) {
    let body = json!({ "name": "Alton Towers", "country": "GB" });
    let (status, park) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(park["areas"], json!([]));
    assert_eq!(areas(&db, &park["id"]).await, json!([]));
}

#[sqlx::test]
async fn areas_are_listed_by_name(db: PgPool) {
    let park = create(
        &db,
        json!([{ "name": "X-Sector" }, { "name": "Forbidden Valley" }, { "name": "Katanga Canyon" }]),
    )
    .await;
    let names: Vec<Value> = areas(&db, &park["id"])
        .await
        .as_array()
        .unwrap()
        .iter()
        .map(|area| area["name"].clone())
        .collect();
    assert_eq!(
        names,
        vec![
            json!("Forbidden Valley"),
            json!("Katanga Canyon"),
            json!("X-Sector")
        ]
    );
}

#[sqlx::test]
async fn an_area_keeps_its_id_when_renamed(db: PgPool) {
    let park = create(&db, json!([{ "name": "Gloomy Wood" }])).await;
    let id = area_id(&park, "Gloomy Wood");

    let (status, updated) = update(
        &db,
        &park["id"],
        json!({ "areas": [{ "id": id, "name": "Dark Forest" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    let expected = json!([{ "id": id, "name": "Dark Forest" }]);
    assert_eq!(updated["areas"], expected);
    assert_eq!(areas(&db, &park["id"]).await, expected);
}

#[sqlx::test]
async fn areas_can_be_added_and_removed_in_one_save(db: PgPool) {
    let park = create(
        &db,
        json!([{ "name": "Forbidden Valley" }, { "name": "Gloomy Wood" }]),
    )
    .await;
    let kept = area_id(&park, "Forbidden Valley");

    let (status, updated) = update(
        &db,
        &park["id"],
        json!({ "areas": [{ "id": kept, "name": "Forbidden Valley" }, { "name": "Dark Forest" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    let added = area_id(&updated, "Dark Forest");
    assert_ne!(added, area_id(&park, "Gloomy Wood"));
    let expected = json!([
        { "id": added, "name": "Dark Forest" },
        { "id": kept, "name": "Forbidden Valley" },
    ]);
    assert_eq!(updated["areas"], expected);
    assert_eq!(areas(&db, &park["id"]).await, expected);
}

#[sqlx::test]
async fn sending_no_areas_removes_them_all(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let (status, updated) = update(&db, &park["id"], json!({ "areas": [] })).await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    assert_eq!(areas(&db, &park["id"]).await, json!([]));
}

#[sqlx::test]
async fn leaving_out_areas_keeps_them(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let (status, updated) =
        update(&db, &park["id"], json!({ "name": "Alton Towers Resort" })).await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    assert_eq!(updated["areas"], park["areas"]);
    assert_eq!(areas(&db, &park["id"]).await, park["areas"]);
}

#[sqlx::test]
async fn blank_area_names_are_refused(db: PgPool) {
    for name in ["", " ", "\t\n"] {
        let body = json!({ "name": "Alton Towers", "country": "GB", "areas": [{ "name": name }] });
        let (status, error) =
            post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY, "{name:?}");
        assert_eq!(
            error,
            json!({ "error": "areas[0].name: An Area needs a name" })
        );
    }
    assert!(revisions(&db).await.is_empty());

    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let id = area_id(&park, "Forbidden Valley");
    let (status, _) = update(
        &db,
        &park["id"],
        json!({ "areas": [{ "id": id, "name": " " }] }),
    )
    .await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(areas(&db, &park["id"]).await, park["areas"]);
}

#[sqlx::test]
async fn an_area_id_belonging_to_another_park_is_refused(db: PgPool) {
    let alton = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let thorpe = create_named(&db, "Thorpe Park", json!([{ "name": "Lost City" }])).await;
    let theirs = area_id(&thorpe, "Lost City");

    let (status, error) = update(
        &db,
        &alton["id"],
        json!({ "areas": [{ "id": theirs, "name": "Lost City" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    let theirs_str = theirs.as_str().unwrap();
    assert_eq!(
        error,
        json!({ "error": format!("Area {theirs_str} is not one of this Park's Areas") })
    );
    assert_eq!(areas(&db, &alton["id"]).await, alton["areas"]);
    assert_eq!(areas(&db, &thorpe["id"]).await, thorpe["areas"]);
    assert_eq!(revisions(&db).await.len(), 2);
}

#[sqlx::test]
async fn an_unknown_area_id_is_refused(db: PgPool) {
    let unknown = Uuid::now_v7().to_string();
    let body = json!({
        "name": "Alton Towers",
        "country": "GB",
        "areas": [{ "id": unknown, "name": "Forbidden Valley" }],
    });
    let (status, error) = post_json(padb_api::internal_router(db.clone()), "/parks", &body).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(
        error,
        json!({ "error": format!("Area {unknown} is not one of this Park's Areas") })
    );
    assert!(revisions(&db).await.is_empty());
}

#[sqlx::test]
async fn an_area_sent_twice_is_refused(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let id = area_id(&park, "Forbidden Valley");
    let (status, error) = update(
        &db,
        &park["id"],
        json!({ "areas": [{ "id": id, "name": "Forbidden Valley" }, { "id": id, "name": "Gloomy Wood" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    let id_str = id.as_str().unwrap();
    assert_eq!(
        error,
        json!({ "error": format!("Area {id_str} is sent more than once") })
    );
    assert_eq!(areas(&db, &park["id"]).await, park["areas"]);
}

#[sqlx::test]
async fn the_creation_revision_lists_added_areas_by_id(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let id = area_id(&park, "Forbidden Valley");
    let park_id = Uuid::parse_str(park["id"].as_str().unwrap()).unwrap();
    assert_eq!(
        revisions(&db).await,
        vec![StoredRevision::accepted_system_park(
            park_id,
            json!({
                "name": { "from": null, "to": "Alton Towers" },
                "country": { "from": null, "to": "GB" },
                "areas": { "added": [{ "id": id, "name": "Forbidden Valley" }] },
            })
        )]
    );
}

#[sqlx::test]
async fn the_revision_lists_added_removed_and_changed_areas_by_id(db: PgPool) {
    let park = create(
        &db,
        json!([{ "name": "Forbidden Valley" }, { "name": "Gloomy Wood" }, { "name": "X-Sector" }]),
    )
    .await;
    let renamed = area_id(&park, "Gloomy Wood");
    let removed = area_id(&park, "X-Sector");
    let unchanged = area_id(&park, "Forbidden Valley");

    let (status, updated) = update(
        &db,
        &park["id"],
        json!({ "areas": [
            { "id": unchanged, "name": "Forbidden Valley" },
            { "id": renamed, "name": "Dark Forest" },
            { "name": "Mutiny Bay" },
        ] }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    let added = area_id(&updated, "Mutiny Bay");

    let revisions = revisions(&db).await;
    assert_eq!(revisions.len(), 2);
    assert_eq!(
        revisions[1].changes,
        json!({ "areas": {
            "added": [{ "id": added, "name": "Mutiny Bay" }],
            "removed": [{ "id": removed, "name": "X-Sector" }],
            "changed": [{ "id": renamed, "name": { "from": "Gloomy Wood", "to": "Dark Forest" } }],
        } })
    );
}

#[sqlx::test]
async fn saving_the_same_areas_changes_nothing(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    let (status, error) = update(&db, &park["id"], json!({ "areas": park["areas"] })).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(error, json!({ "error": "This save changes nothing" }));
    assert_eq!(revisions(&db).await.len(), 1);
}

#[sqlx::test]
async fn a_failed_area_save_writes_nothing(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    break_writes_to(&db, Write::Insert, "area").await;

    let (status, _) = update(
        &db,
        &park["id"],
        json!({ "name": "Alton Towers Resort", "areas": [{ "name": "Gloomy Wood" }] }),
    )
    .await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(revisions(&db).await.len(), 1);
    assert_eq!(areas(&db, &park["id"]).await, park["areas"]);
    let (_, read) = get_json(
        padb_api::public_router(db.clone()),
        &format!("/v1/parks/{}", park["id"].as_str().unwrap()),
    )
    .await;
    assert_eq!(read["name"], "Alton Towers");
}

#[sqlx::test]
async fn parks_are_listed_with_their_areas(db: PgPool) {
    let park = create(&db, json!([{ "name": "Forbidden Valley" }])).await;
    create_named(&db, "Thorpe Park", json!([])).await;
    let (status, page) = get_json(padb_api::public_router(db.clone()), "/v1/parks").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(page["parks"][0]["areas"], park["areas"]);
    assert_eq!(page["parks"][1]["areas"], json!([]));
}
