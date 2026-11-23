//! Name History: the former names of something, in order. See ADR 0010

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::partial_date::PartialDate;

/// A name in a Name History, never blank.
///
/// Checked when read from a request; read from the database unchecked, where `park_name_history_name_not_blank` holds it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(try_from = "String")]
#[sqlx(transparent)]
pub struct FormerName(String);

impl TryFrom<String> for FormerName {
    type Error = String;

    fn try_from(name: String) -> Result<Self, Self::Error> {
        // Saved as entered, not trimmed: a Revision holds what the Contributor entered
        if name.trim().is_empty() {
            return Err("A name in a Name History cannot be blank".to_owned());
        }
        Ok(Self(name))
    }
}

/// One former name in a Name History, with the Partial Date it was first used.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
// A misspelt `first_used` would otherwise be dropped and the name saved as undated
#[serde(deny_unknown_fields)]
pub struct NameHistoryEntry {
    #[schema(value_type = String, example = "Alton Park")]
    pub name: FormerName,
    /// When the name was first used, as reduced-precision ISO 8601 (`2022`, `2022-11` or `2022-11-06`); null when unknown. See ADR 0010
    #[serde(default)]
    #[schema(value_type = Option<String>, required, example = "1924")]
    pub first_used: Option<PartialDate>,
}
