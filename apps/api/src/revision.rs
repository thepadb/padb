//! The typed content of Revisions. See ADR 0012

use serde::{Deserialize, Serialize};

use crate::country::Country;
use crate::park_name::ParkName;

/// One changed field: its value before the save and after. `from` is null on creation.
#[derive(Debug, Serialize, Deserialize)]
pub struct FieldChange<T> {
    pub from: Option<T>,
    pub to: Option<T>,
}

impl<T> FieldChange<T> {
    pub fn created(value: T) -> Self {
        Self {
            from: None,
            to: Some(value),
        }
    }
}

impl<T: PartialEq> FieldChange<T> {
    /// The change from `from` to `to`, or none if they are equal.
    pub fn between(from: T, to: T) -> Option<Self> {
        (from != to).then(|| Self {
            from: Some(from),
            to: Some(to),
        })
    }
}

/// Only the Park fields a save changed. Bump `SCHEMA_VERSION` when a field is renamed or reshaped.
#[derive(Debug, Serialize, Deserialize)]
pub struct ParkChanges {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<FieldChange<ParkName>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country: Option<FieldChange<Country>>,
}

impl ParkChanges {
    pub const SCHEMA_VERSION: i32 = 1;

    /// Whether the save changed no field.
    pub fn is_empty(&self) -> bool {
        self.name.is_none() && self.country.is_none()
    }
}
