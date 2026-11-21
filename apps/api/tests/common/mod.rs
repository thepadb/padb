//! Calls the routers in-process, as a consumer would over HTTP.

#![allow(dead_code)]

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt;

pub async fn send(router: Router, request: Request<Body>) -> (StatusCode, String) {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}

pub async fn get(router: Router, uri: &str) -> (StatusCode, String) {
    send(router, Request::get(uri).body(Body::empty()).unwrap()).await
}

pub async fn get_json(router: Router, uri: &str) -> (StatusCode, Value) {
    let (status, body) = get(router, uri).await;
    (status, serde_json::from_str(&body).unwrap_or(Value::Null))
}

pub async fn post_json(router: Router, uri: &str, body: &Value) -> (StatusCode, Value) {
    let request = Request::post(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();
    let (status, body) = send(router, request).await;
    (status, serde_json::from_str(&body).unwrap_or(Value::Null))
}
