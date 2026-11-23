//! The PADB API: a read-only public router and a private internal router. See ADR 0014

mod area;
mod contributor;
mod country;
mod error;
mod name_history;
mod park_name;
mod parks;
mod partial_date;
mod revision;
mod status_history;

use axum::routing::{get, patch, post};
use axum::{Json, Router};
use sqlx::PgPool;
use utoipa::OpenApi;
use utoipa_scalar::{Scalar, Servable};

/// Public routes, and only these, are documented. See ADR 0014
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Parks & Attractions Database API",
        license(name = "AGPL-3.0-only")
    ),
    paths(parks::list_parks, parks::get_park)
)]
struct PublicApi;

/// Read-only routes, served on the public port.
pub fn public_router(db: PgPool) -> Router {
    Router::new()
        .route("/health", get(health))
        .route(
            "/openapi.json",
            get(|| async { Json(PublicApi::openapi()) }),
        )
        .route("/v1/parks", get(parks::list_parks))
        .route("/v1/parks/{id}", get(parks::get_park))
        .with_state(db)
        .merge(Scalar::with_url("/docs", PublicApi::openapi()))
}

/// Routes that write, served only on the private network. See ADR 0014
pub fn internal_router(db: PgPool) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/parks", post(parks::create_park))
        .route("/parks/{id}", patch(parks::update_park))
        .with_state(db)
}

/// Answers while the process can serve requests.
async fn health() -> &'static str {
    "ok"
}
