//! Creating, updating, listing and reading Parks.

use std::collections::HashMap;
use std::fmt;

use axum::Json;
use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use serde::{Deserialize, Deserializer, Serialize};
use sqlx::types::Json as JsonColumn;
use sqlx::{PgConnection, PgExecutor, PgPool, Postgres, Transaction};
use utoipa::openapi::schema::{ObjectBuilder, Type};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::area::{Area, AreaSave, load_areas, save_areas};
use crate::contributor::ContributorId;
use crate::country::Country;
use crate::error::{ApiError, ErrorBody};
use crate::name_history::{FormerName, NameHistoryEntry};
use crate::park_name::ParkName;
use crate::partial_date::{DatePrecision, PartialDate};
use crate::revision::{FieldChange, NameHistoryChange, ParkChanges, StatusHistoryChange};
use crate::status_history::{Status, StatusHistoryEntry};

/// A Park's ID. See ADR 0008
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, sqlx::Type)]
#[serde(transparent)]
#[sqlx(transparent)]
pub struct ParkId(Uuid);

impl fmt::Display for ParkId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// A single fixed site with attractions.
#[derive(Debug, Serialize, ToSchema)]
pub struct Park {
    /// UUIDv7. See ADR 0008
    #[schema(value_type = Uuid)]
    pub id: ParkId,
    /// Original Name
    #[schema(value_type = String)]
    pub name: ParkName,
    /// ISO 3166-1 alpha-2 country code
    #[schema(value_type = String, example = "GB")]
    pub country: Country,
    /// See ADR 0009
    #[schema(schema_with = always_null)]
    pub resort: (),
    /// Every Status the Park has had, in the order saved; the last is its current Status. See ADR 0010
    pub status_history: Vec<StatusHistoryEntry>,
    /// Every former name of the Park, in the order saved. See ADR 0010
    pub name_history: Vec<NameHistoryEntry>,
    /// The Park's Areas, by name
    pub areas: Vec<Area>,
}

impl Park {
    /// A Park as stored; it has no Resort until Resorts exist.
    fn new(
        id: ParkId,
        name: ParkName,
        country: Country,
        histories: Histories,
        areas: Vec<Area>,
    ) -> Self {
        Self {
            id,
            name,
            country,
            resort: (),
            status_history: histories.status,
            name_history: histories.name,
            areas,
        }
    }
}

/// A Park's lists saved whole. See ADR 0012
#[derive(Debug, Default)]
struct Histories {
    status: Vec<StatusHistoryEntry>,
    name: Vec<NameHistoryEntry>,
}

fn always_null() -> ObjectBuilder {
    ObjectBuilder::new()
        .schema_type(Type::Null)
        .description(Some(
            "The Resort this Park belongs to; always null until Resorts exist",
        ))
}

/// What a save of a new Park sends; names and countries are checked as they are read.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NewPark {
    pub name: ParkName,
    pub country: Country,
    /// Left out when nothing is known of it
    #[serde(default)]
    pub status_history: Vec<StatusHistoryEntry>,
    /// Left out when the Park has had no other name
    #[serde(default)]
    pub name_history: Vec<NameHistoryEntry>,
    /// Left out when the Park has no Areas; none may have an ID yet
    #[serde(default)]
    pub areas: Vec<AreaSave>,
}

/// What a save of an existing Park sends; fields left out keep their values, and fields sent as null are refused.
#[derive(Debug, Deserialize)]
// A misspelt field would otherwise be dropped and the rest saved without it
#[serde(deny_unknown_fields)]
pub struct ParkUpdate {
    #[serde(default, deserialize_with = "present")]
    pub name: Option<ParkName>,
    #[serde(default, deserialize_with = "present")]
    pub country: Option<Country>,
    /// Replaces the whole Status History. See ADR 0012
    #[serde(default, deserialize_with = "present")]
    pub status_history: Option<Vec<StatusHistoryEntry>>,
    /// Replaces the whole Name History. See ADR 0012
    #[serde(default, deserialize_with = "present")]
    pub name_history: Option<Vec<NameHistoryEntry>>,
    /// Every Area the Park keeps: those with IDs are updated, those without added, and any left out removed. See ADR 0012
    #[serde(default, deserialize_with = "present")]
    pub areas: Option<Vec<AreaSave>>,
}

/// Reads a field that was sent, so null is refused rather than taken as left out.
fn present<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    T::deserialize(deserializer).map(Some)
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
    fn validate(self) -> Result<(Option<ParkId>, i64, Option<Country>), ApiError> {
        // A cursor is the last listed Park's ID, which orders by creation. See ADR 0008
        let after = self
            .after
            .map(|cursor| {
                Uuid::parse_str(&cursor)
                    .map(ParkId)
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
        let country = self
            .country
            .map(Country::try_from)
            .transpose()
            .map_err(ApiError::BadRequest)?;
        Ok((after, limit, country))
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
        r#"SELECT id AS "id: ParkId", name AS "name: ParkName", country AS "country: Country" FROM park
         WHERE ($1::uuid IS NULL OR id > $1) AND ($2::char(2) IS NULL OR country = $2)
         ORDER BY id
         LIMIT $3"#,
        after as _,
        country as _,
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
    let ids: Vec<ParkId> = rows.iter().map(|park| park.id).collect();
    let mut conn = db.acquire().await?;
    let mut histories = load_histories_by_park(&mut conn, &ids).await?;
    let mut areas = load_areas(&mut *conn, &ids).await?;
    let parks = rows
        .into_iter()
        .map(|park| {
            let histories = histories.remove(&park.id).unwrap_or_default();
            let areas = areas.remove(&park.id).unwrap_or_default();
            Park::new(park.id, park.name, park.country, histories, areas)
        })
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
    Path(id): Path<ParkId>,
) -> Result<Json<Park>, ApiError> {
    let park = sqlx::query!(
        r#"SELECT id AS "id: ParkId", name AS "name: ParkName", country AS "country: Country"
         FROM park WHERE id = $1"#,
        id as _
    )
    .fetch_optional(&db)
    .await?
    .ok_or(ApiError::NotFound("Park"))?;
    let mut conn = db.acquire().await?;
    let histories = load_park_histories(&mut conn, id).await?;
    let areas = load_park_areas(&mut conn, id).await?;
    Ok(Json(Park::new(
        park.id,
        park.name,
        park.country,
        histories,
        areas,
    )))
}

/// Creates a Park, its first Revision and its Change Feed entry in one transaction. See ADR 0011 and ADR 0012
pub async fn create_park(
    State(db): State<PgPool>,
    new: Result<Json<NewPark>, JsonRejection>,
) -> Result<(StatusCode, Json<Park>), ApiError> {
    let Json(NewPark {
        name,
        country,
        status_history,
        name_history,
        areas,
    }) = new?;
    let mut tx = db.begin().await?;

    let id = sqlx::query_scalar!(
        r#"INSERT INTO park (name, country) VALUES ($1, $2) RETURNING id AS "id: ParkId""#,
        &name as _,
        &country as _,
    )
    .fetch_one(&mut *tx)
    .await?;

    replace_status_history(&mut tx, id, &status_history).await?;
    replace_name_history(&mut tx, id, &name_history).await?;
    let areas_change = save_areas(&mut tx, id, &[], areas).await?;

    let changes = ParkChanges {
        name: Some(FieldChange::created(name.clone())),
        country: Some(FieldChange::created(country.clone())),
        status_history: StatusHistoryChange::between(&[], &status_history),
        name_history: NameHistoryChange::between(&[], &name_history),
        areas: areas_change,
    };
    record_save(&mut tx, id, changes).await?;

    // Read back in the order they are listed
    let areas = load_park_areas(&mut tx, id).await?;
    tx.commit().await?;
    Ok((
        StatusCode::CREATED,
        Json(Park::new(
            id,
            name,
            country,
            Histories {
                status: status_history,
                name: name_history,
            },
            areas,
        )),
    ))
}

/// Writes a save's Revision and Change Feed entry, inside the save's transaction. See ADR 0011 and ADR 0012
async fn record_save(
    tx: &mut Transaction<'_, Postgres>,
    id: ParkId,
    changes: ParkChanges,
) -> Result<(), ApiError> {
    // Accepted automatically (`accepted_by` null): only the system Contributor saves, and it is past review. See ADR 0012
    sqlx::query!(
        "INSERT INTO revision (record_type, record_id, contributor_id, schema_version, changes, accepted_at)
         VALUES ('park', $1, $2, $3, $4, now())",
        id as _,
        ContributorId::SYSTEM as _,
        ParkChanges::SCHEMA_VERSION,
        JsonColumn(changes) as _,
    )
    .execute(&mut **tx)
    .await?;

    sqlx::query!(
        "INSERT INTO change (record_type, record_id) VALUES ('park', $1)",
        id as _
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Updates a Park, writing a Revision of only the changed fields and a Change Feed entry in one transaction. See ADR 0011 and ADR 0012
pub async fn update_park(
    State(db): State<PgPool>,
    Path(id): Path<ParkId>,
    update: Result<Json<ParkUpdate>, JsonRejection>,
) -> Result<Json<Park>, ApiError> {
    let Json(ParkUpdate {
        name,
        country,
        status_history,
        name_history,
        areas,
    }) = update?;
    let mut tx = db.begin().await?;

    // Row held `FOR UPDATE` so a concurrent save cannot change the values this Revision records as `from`
    let current = sqlx::query!(
        r#"SELECT name AS "name: ParkName", country AS "country: Country"
         FROM park WHERE id = $1 FOR UPDATE"#,
        id as _
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(ApiError::NotFound("Park"))?;

    // Read after the Park's row is locked, so they are the histories this save replaces
    let current_histories = load_park_histories(&mut tx, id).await?;
    let current_areas = load_park_areas(&mut tx, id).await?;
    // Written now, as Areas get their IDs when inserted; rolled back below if the save is refused
    let areas_change = match areas {
        Some(areas) => save_areas(&mut tx, id, &current_areas, areas).await?,
        None => None,
    };

    let name = name.unwrap_or_else(|| current.name.clone());
    let country = country.unwrap_or_else(|| current.country.clone());
    let changes = ParkChanges {
        name: FieldChange::between(current.name, name.clone()),
        country: FieldChange::between(current.country, country.clone()),
        status_history: status_history
            .as_ref()
            .and_then(|history| StatusHistoryChange::between(&current_histories.status, history)),
        name_history: name_history
            .as_ref()
            .and_then(|history| NameHistoryChange::between(&current_histories.name, history)),
        areas: areas_change,
    };
    if changes.is_empty() {
        return Err(ApiError::Invalid("This save changes nothing".to_owned()));
    }

    sqlx::query!(
        "UPDATE park SET name = $2, country = $3, updated_at = now() WHERE id = $1",
        id as _,
        &name as _,
        &country as _,
    )
    .execute(&mut *tx)
    .await?;
    if let (Some(history), Some(_)) = (&status_history, &changes.status_history) {
        replace_status_history(&mut tx, id, history).await?;
    }
    if let (Some(history), Some(_)) = (&name_history, &changes.name_history) {
        replace_name_history(&mut tx, id, history).await?;
    }
    let areas_changed = changes.areas.is_some();
    record_save(&mut tx, id, changes).await?;
    let areas = if areas_changed {
        load_park_areas(&mut tx, id).await?
    } else {
        current_areas
    };

    tx.commit().await?;
    let histories = Histories {
        status: status_history.unwrap_or(current_histories.status),
        name: name_history.unwrap_or(current_histories.name),
    };
    Ok(Json(Park::new(id, name, country, histories, areas)))
}

/// The Status Histories of the Parks `ids`, each in order; Parks with none are left out.
async fn load_status_histories(
    db: impl PgExecutor<'_>,
    ids: &[ParkId],
) -> Result<HashMap<ParkId, Vec<StatusHistoryEntry>>, sqlx::Error> {
    let ids: Vec<Uuid> = ids.iter().map(|id| id.0).collect();
    let rows = sqlx::query!(
        r#"SELECT park_id AS "park_id: ParkId", status AS "status: Status",
             to_char(began_on, 'YYYY-MM-DD') AS began_on,
             began_precision AS "began_precision: DatePrecision"
         FROM park_status_history WHERE park_id = ANY($1)
         ORDER BY park_id, position"#,
        &ids,
    )
    .fetch_all(db)
    .await?;
    let mut histories: HashMap<ParkId, Vec<StatusHistoryEntry>> = HashMap::new();
    for row in rows {
        let began = PartialDate::read_stored(row.began_on, row.began_precision)?;
        histories
            .entry(row.park_id)
            .or_default()
            .push(StatusHistoryEntry {
                status: row.status,
                began,
            });
    }
    Ok(histories)
}

/// The histories of the Parks `ids`; Parks with none are left out.
async fn load_histories_by_park(
    db: &mut PgConnection,
    ids: &[ParkId],
) -> Result<HashMap<ParkId, Histories>, sqlx::Error> {
    let statuses = load_status_histories(&mut *db, ids).await?;
    let names = load_name_histories(&mut *db, ids).await?;
    let mut histories: HashMap<ParkId, Histories> = HashMap::new();
    for (id, status) in statuses {
        histories.entry(id).or_default().status = status;
    }
    for (id, name) in names {
        histories.entry(id).or_default().name = name;
    }
    Ok(histories)
}

/// The histories of the Park `id`, each in order.
async fn load_park_histories(db: &mut PgConnection, id: ParkId) -> Result<Histories, sqlx::Error> {
    Ok(load_histories_by_park(db, &[id])
        .await?
        .remove(&id)
        .unwrap_or_default())
}

/// The Areas of the Park `id`, by name.
async fn load_park_areas(db: &mut PgConnection, id: ParkId) -> Result<Vec<Area>, sqlx::Error> {
    Ok(load_areas(db, &[id]).await?.remove(&id).unwrap_or_default())
}

/// The Name Histories of the Parks `ids`, each in order; Parks with none are left out.
async fn load_name_histories(
    db: impl PgExecutor<'_>,
    ids: &[ParkId],
) -> Result<HashMap<ParkId, Vec<NameHistoryEntry>>, sqlx::Error> {
    let ids: Vec<Uuid> = ids.iter().map(|id| id.0).collect();
    let rows = sqlx::query!(
        r#"SELECT park_id AS "park_id: ParkId", name AS "name: FormerName",
             to_char(first_used_on, 'YYYY-MM-DD') AS first_used_on,
             first_used_precision AS "first_used_precision: DatePrecision"
         FROM park_name_history WHERE park_id = ANY($1)
         ORDER BY park_id, position"#,
        &ids,
    )
    .fetch_all(db)
    .await?;
    let mut histories: HashMap<ParkId, Vec<NameHistoryEntry>> = HashMap::new();
    for row in rows {
        let first_used = PartialDate::read_stored(row.first_used_on, row.first_used_precision)?;
        histories
            .entry(row.park_id)
            .or_default()
            .push(NameHistoryEntry {
                name: row.name,
                first_used,
            });
    }
    Ok(histories)
}

/// Replaces the Park `id`'s Status History with `entries`, numbered by position, inside the save's transaction. See ADR 0012
async fn replace_status_history(
    tx: &mut Transaction<'_, Postgres>,
    id: ParkId,
    entries: &[StatusHistoryEntry],
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "DELETE FROM park_status_history WHERE park_id = $1",
        id as _
    )
    .execute(&mut **tx)
    .await?;
    for (position, entry) in (0_i32..).zip(entries) {
        let (began_on, began_precision) = entry.began.map(PartialDate::stored).unzip();
        sqlx::query!(
            "INSERT INTO park_status_history (park_id, position, status, began_on, began_precision)
             VALUES ($1, $2, $3, $4::text::date, $5)",
            id as _,
            position,
            entry.status as _,
            began_on,
            began_precision as _,
        )
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

/// Replaces the Park `id`'s Name History with `entries`, numbered by position, inside the save's transaction. See ADR 0012
async fn replace_name_history(
    tx: &mut Transaction<'_, Postgres>,
    id: ParkId,
    entries: &[NameHistoryEntry],
) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM park_name_history WHERE park_id = $1", id as _)
        .execute(&mut **tx)
        .await?;
    for (position, entry) in (0_i32..).zip(entries) {
        let (first_used_on, first_used_precision) =
            entry.first_used.map(PartialDate::stored).unzip();
        sqlx::query!(
            "INSERT INTO park_name_history (park_id, position, name, first_used_on, first_used_precision)
             VALUES ($1, $2, $3, $4::text::date, $5)",
            id as _,
            position,
            &entry.name as _,
            first_used_on,
            first_used_precision as _,
        )
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}
