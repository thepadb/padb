//! Errors every route can answer with, as `{ "error": "..." }`.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug)]
pub enum ApiError {
    /// The request was understood but its content is refused.
    Invalid(String),
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

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error) = match self {
            Self::Invalid(message) => (StatusCode::UNPROCESSABLE_ENTITY, message),
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
