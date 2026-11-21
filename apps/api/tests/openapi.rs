//! The API serves its OpenAPI docs, listing public routes only. See ADR 0014

mod common;

use axum::http::StatusCode;
use common::{get, get_json};
use sqlx::PgPool;

#[sqlx::test]
async fn spec_lists_only_public_routes(db: PgPool) {
    let (status, spec) = get_json(padb_api::public_router(db), "/openapi.json").await;
    assert_eq!(status, StatusCode::OK);
    let mut operations: Vec<String> = spec["paths"]
        .as_object()
        .unwrap()
        .iter()
        .flat_map(|(path, item)| {
            item.as_object()
                .unwrap()
                .keys()
                .map(move |method| format!("{} {path}", method.to_uppercase()))
        })
        .collect();
    operations.sort();
    assert_eq!(operations, vec!["GET /v1/parks", "GET /v1/parks/{id}"]);
}

#[sqlx::test]
async fn docs_page_is_served(db: PgPool) {
    let (status, html) = get(padb_api::public_router(db), "/docs").await;
    assert_eq!(status, StatusCode::OK);
    assert!(html.contains("<html"));
}

#[sqlx::test]
async fn internal_router_serves_no_docs(db: PgPool) {
    let (status, _) = get(padb_api::internal_router(db), "/openapi.json").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
