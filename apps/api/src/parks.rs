//! Creating and reading Parks.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use sqlx::types::Json as JsonColumn;
use utoipa::ToSchema;
use utoipa::openapi::schema::{ObjectBuilder, Type};
use uuid::Uuid;

use crate::country;
use crate::error::{ApiError, ErrorBody};
use crate::revision::{FieldChange, ParkChanges};

/// Seeded by the first migration; authors saves until Contributors sign in. See ADR 0013
const SYSTEM_CONTRIBUTOR_ID: Uuid = Uuid::from_u128(0x00000000_0000_7000_8000_000000000001);

/// A single fixed site with attractions.
#[derive(Debug, Serialize, ToSchema)]
pub struct Park {
    /// UUIDv7. See ADR 0008
    pub id: Uuid,
    /// Original Name
    pub name: String,
    /// ISO 3166-1 alpha-2 country code
    #[schema(example = "GB")]
    pub country: String,
    /// See ADR 0009
    #[schema(schema_with = always_null)]
    pub resort: (),
}

fn always_null() -> ObjectBuilder {
    ObjectBuilder::new()
        .schema_type(Type::Null)
        .description(Some(
            "The Resort this Park belongs to; always null until Resorts exist",
        ))
}

/// What a save of a new Park sends.
#[derive(Debug, Deserialize)]
pub struct NewPark {
    pub name: String,
    pub country: String,
}

impl NewPark {
    /// Refuses blank names and unassigned country codes, returning the Park's fields as they will be saved.
    fn validate(self) -> Result<(String, String), ApiError> {
        // Saved as entered, not trimmed: a Revision holds what the Contributor entered
        if self.name.trim().is_empty() {
            return Err(ApiError::Invalid("A Park needs a name".to_owned()));
        }
        if !country::is_alpha_2(&self.country) {
            return Err(ApiError::Invalid(format!(
                "{:?} is not an ISO 3166-1 alpha-2 country code",
                self.country
            )));
        }
        Ok((self.name, self.country))
    }
}

/// Get a Park
#[utoipa::path(
    get,
    path = "/v1/parks/{id}",
    params(("id" = Uuid, Path, description = "The Park's ID")),
    responses(
        (status = 200, description = "The Park", body = Park),
        (status = 404, description = "No Park has this ID", body = ErrorBody),
    ),
)]
pub async fn get_park(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Park>, ApiError> {
    let park = sqlx::query!("SELECT id, name, country FROM park WHERE id = $1", id)
        .fetch_optional(&db)
        .await?
        .ok_or(ApiError::NotFound("Park"))?;
    Ok(Json(Park {
        id: park.id,
        name: park.name,
        country: park.country,
        resort: (),
    }))
}

/// Creates a Park, its first Revision and its Change Feed entry in one transaction. See ADR 0011 and ADR 0012
pub async fn create_park(
    State(db): State<PgPool>,
    Json(new): Json<NewPark>,
) -> Result<(StatusCode, Json<Park>), ApiError> {
    let (name, country) = new.validate()?;
    let mut tx = db.begin().await?;

    let id = sqlx::query_scalar!(
        "INSERT INTO park (name, country) VALUES ($1, $2) RETURNING id",
        name,
        country
    )
    .fetch_one(&mut *tx)
    .await?;

    let changes = ParkChanges {
        name: Some(FieldChange::created(name.clone())),
        country: Some(FieldChange::created(country.clone())),
    };
    // Accepted automatically (`accepted_by` null): only the system Contributor saves, and it is past review. See ADR 0012
    sqlx::query!(
        "INSERT INTO revision (record_type, record_id, contributor_id, schema_version, changes, accepted_at)
         VALUES ('park', $1, $2, $3, $4, now())",
        id,
        SYSTEM_CONTRIBUTOR_ID,
        ParkChanges::SCHEMA_VERSION,
        JsonColumn(changes) as _,
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "INSERT INTO change (record_type, record_id) VALUES ('park', $1)",
        id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok((
        StatusCode::CREATED,
        Json(Park {
            id,
            name,
            country,
            resort: (),
        }),
    ))
}
