//! Creating, updating, listing and reading Parks.

use axum::Json;
use axum::extract::rejection::QueryRejection;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use sqlx::types::Json as JsonColumn;
use sqlx::{PgPool, Postgres, Transaction};
use utoipa::openapi::schema::{ObjectBuilder, Type};
use utoipa::{IntoParams, ToSchema};
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

impl Park {
    /// A Park as stored; it has no Resort until Resorts exist.
    fn new(id: Uuid, name: String, country: String) -> Self {
        Self {
            id,
            name,
            country,
            resort: (),
        }
    }
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
        Ok((validate_name(self.name)?, validate_country(self.country)?))
    }
}

/// What a save of an existing Park sends; fields left out keep their values.
#[derive(Debug, Deserialize)]
pub struct ParkUpdate {
    pub name: Option<String>,
    pub country: Option<String>,
}

impl ParkUpdate {
    /// Refuses blank names and unassigned country codes, as on create, returning the fields sent.
    fn validate(self) -> Result<(Option<String>, Option<String>), ApiError> {
        Ok((
            self.name.map(validate_name).transpose()?,
            self.country.map(validate_country).transpose()?,
        ))
    }
}

/// Refuses a blank name.
fn validate_name(name: String) -> Result<String, ApiError> {
    // Saved as entered, not trimmed: a Revision holds what the Contributor entered
    if name.trim().is_empty() {
        return Err(ApiError::Invalid("A Park needs a name".to_owned()));
    }
    Ok(name)
}

/// Refuses a country that is not an assigned ISO 3166-1 alpha-2 code.
fn validate_country(country: String) -> Result<String, ApiError> {
    if !country::is_alpha_2(&country) {
        return Err(ApiError::Invalid(format!(
            "{country:?} is not an ISO 3166-1 alpha-2 country code"
        )));
    }
    Ok(country)
}

/// How many Parks a page holds when no `limit` is given.
const DEFAULT_LIMIT: i64 = 50;
/// The most Parks a page may hold.
const MAX_LIMIT: i64 = 100;

/// What a list of Parks is narrowed and paged by. Read as text so a bad value gets a JSON error.
#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ListParks {
    /// The `next` cursor from the previous page; leave out for the first page
    after: Option<String>,
    /// How many Parks to return
    // utoipa takes only literals here; a test keeps them matching MAX_LIMIT and DEFAULT_LIMIT
    #[param(value_type = Option<u32>, minimum = 1, maximum = 100, default = 50)]
    limit: Option<String>,
    /// Only Parks in this ISO 3166-1 alpha-2 country code
    #[param(example = "GB")]
    country: Option<String>,
}

/// One page of Parks, oldest first.
#[derive(Debug, Serialize, ToSchema)]
pub struct ParkPage {
    pub parks: Vec<Park>,
    /// Opaque; pass back as `after` for the next page. Null on the last page
    #[schema(required)]
    pub next: Option<String>,
}

impl ListParks {
    /// Refuses cursors, limits and countries that cannot be read, returning the Park to list after, the page size and the country.
    fn validate(self) -> Result<(Option<Uuid>, i64, Option<String>), ApiError> {
        // A cursor is the last listed Park's ID, which orders by creation. See ADR 0008
        let after = self
            .after
            .map(|cursor| {
                Uuid::parse_str(&cursor)
                    .map_err(|_| ApiError::BadRequest(format!("{cursor:?} is not a cursor")))
            })
            .transpose()?;
        let limit = match self.limit {
            None => DEFAULT_LIMIT,
            Some(limit) => limit
                .parse()
                .ok()
                .filter(|limit| (1..=MAX_LIMIT).contains(limit))
                .ok_or_else(|| {
                    ApiError::BadRequest(format!(
                        "limit must be a whole number from 1 to {MAX_LIMIT}, not {limit:?}"
                    ))
                })?,
        };
        if let Some(country) = &self.country
            && !country::is_alpha_2(country)
        {
            return Err(ApiError::BadRequest(format!(
                "{country:?} is not an ISO 3166-1 alpha-2 country code"
            )));
        }
        Ok((after, limit, self.country))
    }
}

/// List Parks
///
/// Pages forwards by cursor, oldest first. See ADR 0009 and ADR 0014
#[utoipa::path(
    get,
    path = "/v1/parks",
    params(ListParks),
    responses(
        (status = 200, description = "A page of Parks", body = ParkPage),
        (status = 400, description = "The cursor, limit or country cannot be read", body = ErrorBody),
    ),
)]
pub async fn list_parks(
    State(db): State<PgPool>,
    query: Result<Query<ListParks>, QueryRejection>,
) -> Result<Json<ParkPage>, ApiError> {
    let Query(query) = query.map_err(|rejection| ApiError::BadRequest(rejection.body_text()))?;
    let (after, limit, country) = query.validate()?;
    // One more than the page holds, to learn whether another page follows
    let mut rows = sqlx::query!(
        "SELECT id, name, country FROM park
         WHERE ($1::uuid IS NULL OR id > $1) AND ($2::char(2) IS NULL OR country = $2)
         ORDER BY id
         LIMIT $3",
        after,
        country,
        limit + 1,
    )
    .fetch_all(&db)
    .await?;
    let next = if rows.len() as i64 > limit {
        rows.truncate(limit as usize);
        rows.last().map(|park| park.id.to_string())
    } else {
        None
    };
    let parks = rows
        .into_iter()
        .map(|park| Park::new(park.id, park.name, park.country))
        .collect();
    Ok(Json(ParkPage { parks, next }))
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
    Ok(Json(Park::new(park.id, park.name, park.country)))
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
    record_save(&mut tx, id, changes).await?;

    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(Park::new(id, name, country))))
}

/// Writes a save's Revision and Change Feed entry, inside the save's transaction. See ADR 0011 and ADR 0012
async fn record_save(
    tx: &mut Transaction<'_, Postgres>,
    id: Uuid,
    changes: ParkChanges,
) -> Result<(), ApiError> {
    // Accepted automatically (`accepted_by` null): only the system Contributor saves, and it is past review. See ADR 0012
    sqlx::query!(
        "INSERT INTO revision (record_type, record_id, contributor_id, schema_version, changes, accepted_at)
         VALUES ('park', $1, $2, $3, $4, now())",
        id,
        SYSTEM_CONTRIBUTOR_ID,
        ParkChanges::SCHEMA_VERSION,
        JsonColumn(changes) as _,
    )
    .execute(&mut **tx)
    .await?;

    sqlx::query!(
        "INSERT INTO change (record_type, record_id) VALUES ('park', $1)",
        id
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Updates a Park, writing a Revision of only the changed fields and a Change Feed entry in one transaction. See ADR 0011 and ADR 0012
pub async fn update_park(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(update): Json<ParkUpdate>,
) -> Result<Json<Park>, ApiError> {
    let (name, country) = update.validate()?;
    let mut tx = db.begin().await?;

    // Row held `FOR UPDATE` so a concurrent save cannot change the values this Revision records as `from`
    let current = sqlx::query!(
        "SELECT name, country FROM park WHERE id = $1 FOR UPDATE",
        id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(ApiError::NotFound("Park"))?;

    let name = name.unwrap_or_else(|| current.name.clone());
    let country = country.unwrap_or_else(|| current.country.clone());
    let changes = ParkChanges {
        name: FieldChange::between(current.name, name.clone()),
        country: FieldChange::between(current.country, country.clone()),
    };
    if changes.is_empty() {
        return Err(ApiError::Invalid("This save changes nothing".to_owned()));
    }

    sqlx::query!(
        "UPDATE park SET name = $2, country = $3, updated_at = now() WHERE id = $1",
        id,
        name,
        country,
    )
    .execute(&mut *tx)
    .await?;
    record_save(&mut tx, id, changes).await?;

    tx.commit().await?;
    Ok(Json(Park::new(id, name, country)))
}
