//! Both routers answer a health check, so deploys and local runs can tell each port is up.

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

async fn get(router: Router, uri: &str) -> (StatusCode, String) {
    let request = Request::get(uri).body(Body::empty()).unwrap();
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}

#[tokio::test]
async fn public_router_answers_health_check() {
    assert_eq!(
        get(padb_api::public_router(), "/health").await,
        (StatusCode::OK, "ok".to_owned())
    );
}

#[tokio::test]
async fn internal_router_answers_health_check() {
    assert_eq!(
        get(padb_api::internal_router(), "/health").await,
        (StatusCode::OK, "ok".to_owned())
    );
}

#[tokio::test]
async fn unknown_routes_are_not_found() {
    let (status, _) = get(padb_api::public_router(), "/nope").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
