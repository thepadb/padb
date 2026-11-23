//! The typed content of Revisions. See ADR 0012

use serde::{Deserialize, Serialize};

use crate::country::Country;
use crate::name_history::NameHistoryEntry;
use crate::park_name::ParkName;
use crate::status_history::StatusHistoryEntry;

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_history: Option<StatusHistoryChange>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name_history: Option<NameHistoryChange>,
}

impl ParkChanges {
    pub const SCHEMA_VERSION: i32 = 1;

    /// Whether the save changed no field.
    pub fn is_empty(&self) -> bool {
        self.name.is_none()
            && self.country.is_none()
            && self.status_history.is_none()
            && self.name_history.is_none()
    }
}

/// A history entry at its position, as added or removed.
#[derive(Debug, Serialize, Deserialize)]
pub struct EntryAt<E> {
    pub position: i32,
    #[serde(flatten)]
    pub entry: E,
}

/// A history entry that changed, at its position after the save.
#[derive(Debug, Serialize, Deserialize)]
pub struct EntryChange<E> {
    pub position: i32,
    pub from: E,
    pub to: E,
}

/// How a save changed a Status History.
pub type StatusHistoryChange = HistoryChange<StatusHistoryEntry>;
/// How a save changed a Name History.
pub type NameHistoryChange = HistoryChange<NameHistoryEntry>;

/// How a save changed a history saved whole, such as Status History. Its entries have no IDs, so the lists are matched by their longest run of unchanged entries in order. See ADR 0012
///
/// Removed entries are at their positions before the save; added and changed entries at their positions after it.
#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryChange<E> {
    #[serde(default = "Vec::new", skip_serializing_if = "Vec::is_empty")]
    pub added: Vec<EntryAt<E>>,
    #[serde(default = "Vec::new", skip_serializing_if = "Vec::is_empty")]
    pub removed: Vec<EntryAt<E>>,
    #[serde(default = "Vec::new", skip_serializing_if = "Vec::is_empty")]
    pub changed: Vec<EntryChange<E>>,
}

// By hand, so entries need not have a default themselves
impl<E> Default for HistoryChange<E> {
    fn default() -> Self {
        Self {
            added: Vec::new(),
            removed: Vec::new(),
            changed: Vec::new(),
        }
    }
}

impl<E: Clone + PartialEq> HistoryChange<E> {
    /// The change from `from` to `to`, or none if they are equal.
    pub fn between(from: &[E], to: &[E]) -> Option<Self> {
        // longest[i][j]: how many entries `from[i..]` and `to[j..]` have in common, in order
        let mut longest = vec![vec![0_usize; to.len() + 1]; from.len() + 1];
        for i in (0..from.len()).rev() {
            for j in (0..to.len()).rev() {
                longest[i][j] = if from[i] == to[j] {
                    longest[i + 1][j + 1] + 1
                } else {
                    longest[i + 1][j].max(longest[i][j + 1])
                };
            }
        }

        let mut change = Self::default();
        // Entries removed and added since the last unchanged entry; paired up, they are changes
        let (mut removed, mut added) = (Vec::new(), Vec::new());
        let (mut i, mut j) = (0, 0);
        while i < from.len() || j < to.len() {
            if i < from.len() && j < to.len() && from[i] == to[j] {
                change.record(from, to, &mut removed, &mut added);
                i += 1;
                j += 1;
            } else if j < to.len() && (i == from.len() || longest[i][j + 1] >= longest[i + 1][j]) {
                added.push(j);
                j += 1;
            } else {
                removed.push(i);
                i += 1;
            }
        }
        change.record(from, to, &mut removed, &mut added);

        let unchanged =
            change.added.is_empty() && change.removed.is_empty() && change.changed.is_empty();
        (!unchanged).then_some(change)
    }

    /// Records the positions `removed` from `from` and `added` to `to` between two unchanged entries, pairing them in order as changes.
    fn record(&mut self, from: &[E], to: &[E], removed: &mut Vec<usize>, added: &mut Vec<usize>) {
        let paired = removed.len().min(added.len());
        for (&before, &after) in removed.iter().zip(added.iter()) {
            self.changed.push(EntryChange {
                position: position(after),
                from: from[before].clone(),
                to: to[after].clone(),
            });
        }
        for &before in &removed[paired..] {
            self.removed.push(EntryAt {
                position: position(before),
                entry: from[before].clone(),
            });
        }
        for &after in &added[paired..] {
            self.added.push(EntryAt {
                position: position(after),
                entry: to[after].clone(),
            });
        }
        removed.clear();
        added.clear();
    }
}

fn position(index: usize) -> i32 {
    i32::try_from(index).expect("histories fit in i32 positions")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn history_changes_read_back_as_written() {
        let change = json!({
            "added": [{ "position": 2, "name": "Alton Towers Resort", "first_used": null }],
            "removed": [{ "position": 0, "name": "Alton Park", "first_used": "1924" }],
            "changed": [{
                "position": 1,
                "from": { "name": "Alton Towers", "first_used": "1980" },
                "to": { "name": "Alton Towers", "first_used": "1980-04" },
            }],
        });
        let read: NameHistoryChange = serde_json::from_value(change.clone()).unwrap();
        assert_eq!(serde_json::to_value(read).unwrap(), change);
    }
}
