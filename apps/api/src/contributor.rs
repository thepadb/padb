//! Contributors, who author every Revision. See ADR 0013

use uuid::Uuid;

/// A Contributor's ID. See ADR 0008
#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type)]
#[sqlx(transparent)]
pub struct ContributorId(Uuid);

impl ContributorId {
    /// Seeded by the first migration; authors saves until Contributors sign in. See ADR 0013
    pub const SYSTEM: Self = Self(Uuid::from_u128(0x00000000_0000_7000_8000_000000000001));
}
