//! The PADB API: a read-only public router and a private internal router. See ADR 0014

use axum::Router;
use axum::routing::get;

/// Read-only routes, served on the public port.
pub fn public_router() -> Router {
    Router::new().route("/health", get(health))
}

/// Routes that write, served only on the private network. See ADR 0014
pub fn internal_router() -> Router {
    Router::new().route("/health", get(health))
}

/// Answers while the process can serve requests.
async fn health() -> &'static str {
    "ok"
}
