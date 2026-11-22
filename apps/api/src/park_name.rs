//! The names Parks may record.

use serde::{Deserialize, Serialize};

/// A Park's Original Name, never blank.
///
/// Checked when read from a request; read from the database unchecked, where `park_name_not_blank` holds it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(try_from = "String")]
#[sqlx(transparent)]
pub struct ParkName(String);

impl TryFrom<String> for ParkName {
    type Error = String;

    fn try_from(name: String) -> Result<Self, Self::Error> {
        // Saved as entered, not trimmed: a Revision holds what the Contributor entered
        if name.trim().is_empty() {
            return Err("A Park needs a name".to_owned());
        }
        Ok(Self(name))
    }
}
