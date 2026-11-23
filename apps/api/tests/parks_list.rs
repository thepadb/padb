//! Listing Parks through the public API, a page at a time. See ADR 0009 and ADR 0014

mod common;

use std::collections::HashSet;

use axum::http::StatusCode;
use common::{get_json, post_json};
use serde_json::{Value, json};
use sqlx::PgPool;

async fn create(db: &PgPool, name: &str, country: &str) -> String {
    let (status, park) = post_json(
        padb_api::internal_router(db.clone()),
        "/parks",
        &json!({ "name": name, "country": country }),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    park["id"].as_str().unwrap().to_owned()
}

async fn create_many(db: &PgPool, count: usize) -> Vec<String> {
    let mut ids = Vec::with_capacity(count);
    for n in 0..count {
        ids.push(create(db, &format!("Park {n}"), "GB").await);
    }
    ids
}

async fn list(db: &PgPool, query: &str) -> (StatusCode, Value) {
    get_json(
        padb_api::public_router(db.clone()),
        &format!("/v1/parks{query}"),
    )
    .await
}

/// One page's Park IDs and the cursor to the next page, if any.
async fn page(db: &PgPool, query: &str) -> (Vec<String>, Option<String>) {
    let (status, body) = list(db, query).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "GET /v1/parks{query} answered {body}"
    );
    let ids = body["parks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|park| park["id"].as_str().unwrap().to_owned())
        .collect();
    let next = body["next"].as_str().map(str::to_owned);
    (ids, next)
}

/// Every Park ID seen paging forwards from the first page, in order, and how many pages it took.
async fn page_through(db: &PgPool, filter: &str) -> (Vec<String>, usize) {
    let (mut seen, mut next) = page(db, &format!("?{filter}")).await;
    let mut pages = 1;
    while let Some(cursor) = next {
        let (ids, after) = page(db, &format!("?{filter}&after={cursor}")).await;
        seen.extend(ids);
        next = after;
        pages += 1;
    }
    (seen, pages)
}

fn assert_each_once(seen: &[String], expected: &[String]) {
    let unique: HashSet<&String> = seen.iter().collect();
    assert_eq!(
        unique.len(),
        seen.len(),
        "a Park was listed twice: {seen:?}"
    );
    assert_eq!(unique, expected.iter().collect(), "listed {seen:?}");
}

#[sqlx::test]
async fn no_parks_is_an_empty_last_page(db: PgPool) {
    let (status, body) = list(&db, "").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, json!({ "parks": [], "next": null }));
}

#[sqlx::test]
async fn parks_are_listed_as_they_are_read_one_by_one(db: PgPool) {
    let id = create(&db, "Alton Towers", "GB").await;
    let (_, body) = list(&db, "").await;
    assert_eq!(
        body,
        json!({
            "parks": [{ "id": id, "name": "Alton Towers", "country": "GB", "resort": null, "status_history": [] }],
            "next": null,
        })
    );
}

#[sqlx::test]
async fn paging_forwards_visits_every_park_once(db: PgPool) {
    let created = create_many(&db, 7).await;
    let (seen, pages) = page_through(&db, "limit=3").await;
    assert_each_once(&seen, &created);
    assert_eq!(pages, 3);
}

#[sqlx::test]
async fn a_full_last_page_has_no_next_cursor(db: PgPool) {
    create_many(&db, 3).await;
    let (ids, next) = page(&db, "?limit=3").await;
    assert_eq!(ids.len(), 3);
    assert_eq!(next, None);
}

#[sqlx::test]
async fn pages_hold_50_parks_by_default(db: PgPool) {
    let created = create_many(&db, 51).await;
    let (ids, next) = page(&db, "").await;
    assert_eq!(ids.len(), 50);
    let (rest, last) = page(&db, &format!("?after={}", next.unwrap())).await;
    assert_eq!(last, None);
    assert_each_once(&[ids, rest].concat(), &created);
}

#[sqlx::test]
async fn a_park_created_while_paging_is_visited_once(db: PgPool) {
    let mut created = create_many(&db, 5).await;
    let (mut seen, next) = page(&db, "?limit=2").await;
    created.push(create(&db, "Opened Mid-way", "GB").await);

    let mut next = next;
    while let Some(cursor) = next {
        let (ids, after) = page(&db, &format!("?limit=2&after={cursor}")).await;
        seen.extend(ids);
        next = after;
    }
    assert_each_once(&seen, &created);
}

#[sqlx::test]
async fn country_filter_lists_only_parks_in_that_country(db: PgPool) {
    let mut gb = vec![create(&db, "Alton Towers", "GB").await];
    create(&db, "Cedar Point", "US").await;
    gb.push(create(&db, "Thorpe Park", "GB").await);
    create(&db, "Parc Astérix", "FR").await;
    gb.push(create(&db, "Blackpool Pleasure Beach", "GB").await);

    let (_, body) = list(&db, "?country=GB").await;
    let countries: Vec<&Value> = body["parks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|park| &park["country"])
        .collect();
    assert_eq!(countries, vec!["GB"; 3]);

    // The filter holds on every page, not just the first
    let (seen, pages) = page_through(&db, "country=GB&limit=1").await;
    assert_each_once(&seen, &gb);
    assert_eq!(pages, 3);
}

#[sqlx::test]
async fn country_with_no_parks_is_an_empty_list(db: PgPool) {
    create(&db, "Alton Towers", "GB").await;
    let (_, body) = list(&db, "?country=JP").await;
    assert_eq!(body, json!({ "parks": [], "next": null }));
}

async fn assert_bad_request(db: &PgPool, query: &str) {
    let (status, body) = list(db, query).await;
    assert_eq!(
        status,
        StatusCode::BAD_REQUEST,
        "GET /v1/parks{query} was not refused"
    );
    assert!(
        body["error"].is_string(),
        "GET /v1/parks{query} gave no error message"
    );
}

#[sqlx::test]
async fn invalid_cursors_are_refused(db: PgPool) {
    create(&db, "Alton Towers", "GB").await;
    for after in ["", "nonsense", "123", "%00", "0196f0c0-0000-7000-8000"] {
        assert_bad_request(&db, &format!("?after={after}")).await;
    }
}

#[sqlx::test]
async fn invalid_limits_are_refused(db: PgPool) {
    for limit in ["", "0", "-1", "101", "1.5", "ten", "99999999999999999999"] {
        assert_bad_request(&db, &format!("?limit={limit}")).await;
    }
}

#[sqlx::test]
async fn invalid_countries_are_refused(db: PgPool) {
    for country in ["", "gb", "GBR", "XX", "UK"] {
        assert_bad_request(&db, &format!("?country={country}")).await;
    }
}

#[sqlx::test]
async fn repeated_parameters_are_refused(db: PgPool) {
    for param in ["after", "limit", "country"] {
        assert_bad_request(&db, &format!("?{param}=a&{param}=b")).await;
    }
}

#[sqlx::test]
async fn the_largest_limit_is_allowed(db: PgPool) {
    let (status, _) = list(&db, "?limit=100").await;
    assert_eq!(status, StatusCode::OK);
}

/// The docs state the limits as literals, so this keeps them matching what is enforced.
#[sqlx::test]
async fn docs_state_the_enforced_limits(db: PgPool) {
    let (_, spec) = get_json(padb_api::public_router(db), "/openapi.json").await;
    let limit = spec["paths"]["/v1/parks"]["get"]["parameters"]
        .as_array()
        .unwrap()
        .iter()
        .find(|param| param["name"] == "limit")
        .unwrap();
    let schema = &limit["schema"];
    assert_eq!(
        (&schema["minimum"], &schema["maximum"], &schema["default"]),
        (&json!(1), &json!(100), &json!(50)),
        "{limit}"
    );
}
