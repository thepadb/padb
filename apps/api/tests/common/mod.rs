//! Calls the routers in-process, as a consumer would over HTTP.

#![allow(dead_code)]

use axum::Router;
use axum::body::Body;
use axum::http::{Method, Request, StatusCode, header};
use http_body_util::BodyExt;
use serde_json::Value;
use sqlx::PgPool;
use tower::ServiceExt;
use uuid::Uuid;

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
    send_json(router, Method::POST, uri, body).await
}

pub async fn patch_json(router: Router, uri: &str, body: &Value) -> (StatusCode, Value) {
    send_json(router, Method::PATCH, uri, body).await
}

async fn send_json(router: Router, method: Method, uri: &str, body: &Value) -> (StatusCode, Value) {
    let request = Request::builder()
        .method(method)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();
    let (status, body) = send(router, request).await;
    (status, serde_json::from_str(&body).unwrap_or(Value::Null))
}

/// A kind of write a save makes to a table.
pub enum Write {
    Insert,
    Update,
}

impl Write {
    fn sql(&self) -> &'static str {
        match self {
            Self::Insert => "INSERT",
            Self::Update => "UPDATE",
        }
    }
}

/// Makes every `write` to `table` fail, standing in for any part of a save going wrong.
pub async fn break_writes_to(db: &PgPool, write: Write, table: &str) {
    let event = write.sql();
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
        "CREATE FUNCTION fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'broken'; END $$;
         CREATE TRIGGER broken BEFORE {event} ON {table} FOR EACH ROW EXECUTE FUNCTION fail();"
    )))
    .execute(db)
    .await
    .unwrap();
}

/// A Revision as stored, with its Contributor's username.
#[derive(Debug, PartialEq, sqlx::FromRow)]
pub struct StoredRevision {
    pub record_type: String,
    pub record_id: Uuid,
    pub username: String,
    pub schema_version: i32,
    pub changes: Value,
    pub accepted: bool,
    pub accepted_by: Option<Uuid>,
    pub rejected: bool,
}

impl StoredRevision {
    /// A Revision of the Park `id` by the system Contributor, accepted without review.
    pub fn accepted_system_park(id: Uuid, changes: Value) -> Self {
        Self {
            record_type: "park".to_owned(),
            record_id: id,
            username: "system".to_owned(),
            schema_version: 1,
            changes,
            accepted: true,
            accepted_by: None,
            rejected: false,
        }
    }
}

/// Every Revision, oldest first.
pub async fn revisions(db: &PgPool) -> Vec<StoredRevision> {
    sqlx::query_as(
        "SELECT r.record_type::text, r.record_id, c.username, r.schema_version, r.changes,
             r.accepted_at IS NOT NULL AS accepted, r.accepted_by, r.rejected_at IS NOT NULL AS rejected
         FROM revision r JOIN contributor c ON c.id = r.contributor_id
         ORDER BY r.id",
    )
    .fetch_all(db)
    .await
    .unwrap()
}

/// Every Change Feed entry as its record type and ID, oldest first.
pub async fn feed_entries(db: &PgPool) -> Vec<(String, Uuid)> {
    sqlx::query_as("SELECT record_type::text, record_id FROM change ORDER BY id")
        .fetch_all(db)
        .await
        .unwrap()
}
