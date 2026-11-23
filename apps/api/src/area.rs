//! Areas: the named parts of a Park, saved by ID with it. See ADR 0012

use std::collections::{HashMap, HashSet};
use std::fmt;

use serde::{Deserialize, Serialize};
use sqlx::{PgExecutor, Postgres, Transaction};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::ApiError;
use crate::parks::ParkId;
use crate::revision::FieldChange;

/// An Area's ID. See ADR 0008
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, sqlx::Type)]
#[serde(transparent)]
#[sqlx(transparent)]
pub struct AreaId(Uuid);

impl fmt::Display for AreaId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// An Area's Original Name, never blank.
///
/// Checked when read from a request; read from the database unchecked, where `area_name_not_blank` holds it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(try_from = "String")]
#[sqlx(transparent)]
pub struct AreaName(String);

impl TryFrom<String> for AreaName {
    type Error = String;

    fn try_from(name: String) -> Result<Self, Self::Error> {
        // Saved as entered, not trimmed: a Revision holds what the Contributor entered
        if name.trim().is_empty() {
            return Err("An Area needs a name".to_owned());
        }
        Ok(Self(name))
    }
}

/// A named part of one Park.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub struct Area {
    /// UUIDv7. See ADR 0008
    #[schema(value_type = Uuid)]
    pub id: AreaId,
    /// Original Name
    #[schema(value_type = String, example = "Fantasyland")]
    pub name: AreaName,
}

/// An Area as a save sends it: with the ID of one of the Park's Areas to update it, or without to add it.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AreaSave {
    #[serde(default)]
    pub id: Option<AreaId>,
    pub name: AreaName,
}

/// How a save changed a Park's Areas, by ID. See ADR 0012
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AreasChange {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub added: Vec<Area>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub removed: Vec<Area>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub changed: Vec<AreaChange>,
}

/// An Area a save changed, with only its fields that changed.
#[derive(Debug, Serialize, Deserialize)]
pub struct AreaChange {
    pub id: AreaId,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<FieldChange<AreaName>>,
}

impl AreasChange {
    fn is_empty(&self) -> bool {
        self.added.is_empty() && self.removed.is_empty() && self.changed.is_empty()
    }
}

/// The Areas of the Parks `ids`, each by name; Parks with none are left out.
pub async fn load_areas(
    db: impl PgExecutor<'_>,
    ids: &[ParkId],
) -> Result<HashMap<ParkId, Vec<Area>>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"SELECT park_id AS "park_id: ParkId", id AS "id: AreaId", name AS "name: AreaName"
         FROM area WHERE park_id = ANY($1)
         ORDER BY park_id, name, id"#,
        ids as _,
    )
    .fetch_all(db)
    .await?;
    let mut areas: HashMap<ParkId, Vec<Area>> = HashMap::new();
    for row in rows {
        areas.entry(row.park_id).or_default().push(Area {
            id: row.id,
            name: row.name,
        });
    }
    Ok(areas)
}

/// Saves the Park `park`'s Areas by ID, inside the save's transaction: `current` is what it has, `wanted` what the save sends. See ADR 0012
///
/// Returns how they changed, or none if they did not; refuses IDs that are not among `current`, or are sent twice.
pub async fn save_areas(
    tx: &mut Transaction<'_, Postgres>,
    park: ParkId,
    current: &[Area],
    wanted: Vec<AreaSave>,
) -> Result<Option<AreasChange>, ApiError> {
    let current_by_id: HashMap<AreaId, &Area> =
        current.iter().map(|area| (area.id, area)).collect();
    let mut sent_ids = HashSet::new();
    for id in wanted.iter().filter_map(|area| area.id) {
        // Also refuses Areas of other Parks, whose IDs are never among this Park's
        if !current_by_id.contains_key(&id) {
            return Err(ApiError::Invalid(format!(
                "Area {id} is not one of this Park's Areas"
            )));
        }
        if !sent_ids.insert(id) {
            return Err(ApiError::Invalid(format!(
                "Area {id} is sent more than once"
            )));
        }
    }

    let mut change = AreasChange {
        removed: current
            .iter()
            .filter(|area| !sent_ids.contains(&area.id))
            .cloned()
            .collect(),
        ..AreasChange::default()
    };
    let removed_ids: Vec<AreaId> = change.removed.iter().map(|area| area.id).collect();
    sqlx::query!("DELETE FROM area WHERE id = ANY($1)", &removed_ids as _)
        .execute(&mut **tx)
        .await?;

    for area in wanted {
        match area.id {
            Some(id) => {
                let before = current_by_id[&id];
                let Some(name) = FieldChange::between(before.name.clone(), area.name.clone())
                else {
                    continue;
                };
                sqlx::query!(
                    "UPDATE area SET name = $2 WHERE id = $1",
                    id as _,
                    &area.name as _,
                )
                .execute(&mut **tx)
                .await?;
                change.changed.push(AreaChange {
                    id,
                    name: Some(name),
                });
            }
            None => {
                let id = sqlx::query_scalar!(
                    r#"INSERT INTO area (park_id, name) VALUES ($1, $2) RETURNING id AS "id: AreaId""#,
                    park as _,
                    &area.name as _,
                )
                .fetch_one(&mut **tx)
                .await?;
                change.added.push(Area {
                    id,
                    name: area.name,
                });
            }
        }
    }
    Ok((!change.is_empty()).then_some(change))
}
