//! Both routers answer a health check, so deploys and local runs can tell each port is up.

mod common;

use axum::http::StatusCode;
use common::get;
use sqlx::PgPool;

#[sqlx::test]
async fn public_router_answers_health_check(db: PgPool) {
    assert_eq!(
        get(padb_api::public_router(db), "/health").await,
        (StatusCode::OK, "ok".to_owned())
    );
}

#[sqlx::test]
async fn internal_router_answers_health_check(db: PgPool) {
    assert_eq!(
        get(padb_api::internal_router(db), "/health").await,
        (StatusCode::OK, "ok".to_owned())
    );
}

#[sqlx::test]
async fn unknown_routes_are_not_found(db: PgPool) {
    let (status, _) = get(padb_api::public_router(db), "/nope").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
