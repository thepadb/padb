//! Errors every route can answer with, as `{ "error": "..." }`.

use std::error::Error;

use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug)]
pub enum ApiError {
    /// The request was understood but its content is refused.
    Invalid(String),
    /// The request could not be read, such as a malformed query parameter.
    BadRequest(String),
    /// A request body that could not be read, answered with the status axum chose for it.
    UnreadableBody(StatusCode, String),
    NotFound(&'static str),
    Database(sqlx::Error),
}

/// What went wrong, in words meant for a person.
#[derive(Serialize, ToSchema)]
pub struct ErrorBody {
    pub error: String,
}

impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        Self::Database(error)
    }
}

impl From<JsonRejection> for ApiError {
    fn from(rejection: JsonRejection) -> Self {
        // The underlying error, e.g. "name: A Park needs a name", without axum's "Failed to deserialize..." before it
        // axum wraps the error, so search its whole chain of sources
        let message = match std::iter::successors(rejection.source(), |error| (*error).source())
            .find_map(|error| error.downcast_ref::<serde_path_to_error::Error<serde_json::Error>>())
        {
            Some(error) => without_position(error),
            None => rejection.body_text(),
        };
        Self::UnreadableBody(rejection.status(), message)
    }
}

/// `error`'s message without serde_json's trailing " at line 1 column 27", which means nothing to a person.
fn without_position(error: &serde_path_to_error::Error<serde_json::Error>) -> String {
    let message = error.to_string();
    let json = error.inner();
    let position = format!(" at line {} column {}", json.line(), json.column());
    match message.strip_suffix(&position) {
        Some(before) => before.to_owned(),
        None => message,
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error) = match self {
            Self::Invalid(message) => (StatusCode::UNPROCESSABLE_ENTITY, message),
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            Self::UnreadableBody(status, message) => (status, message),
            Self::NotFound(what) => (StatusCode::NOT_FOUND, format!("{what} not found")),
            Self::Database(error) => {
                eprintln!("database error: {error}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Something went wrong".to_owned(),
                )
            }
        };
        (status, Json(ErrorBody { error })).into_response()
    }
}
