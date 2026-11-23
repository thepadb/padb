//! Status History: every Status something has had, in order. See ADR 0010

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::partial_date::PartialDate;

/// Where something is in its life.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "status", rename_all = "snake_case")]
pub enum Status {
    Announced,
    UnderConstruction,
    Operating,
    Refurbishing,
    /// Standing But Not Operating
    Sbno,
    Closed,
    Demolished,
    Relocated,
}

/// One Status in a Status History, with the Partial Date it began.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
// A misspelt `began` would otherwise be dropped and the Status saved as undated
#[serde(deny_unknown_fields)]
pub struct StatusHistoryEntry {
    pub status: Status,
    /// When the Status began, as reduced-precision ISO 8601 (`2022`, `2022-11` or `2022-11-06`); null when unknown. See ADR 0010
    #[serde(default)]
    #[schema(value_type = Option<String>, required, example = "2022-11")]
    pub began: Option<PartialDate>,
}
