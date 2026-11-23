//! Partial Dates: dates known only to year, month or day precision. See ADR 0010

use std::fmt;

use serde::{Deserialize, Serialize};

/// How much of a Partial Date is known. See ADR 0010
#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "date_precision", rename_all = "lowercase")]
pub enum DatePrecision {
    Year,
    Month,
    Day,
}

/// A date known only to year, month or day precision, read and written as reduced-precision ISO 8601, never padded. See ADR 0010
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub enum PartialDate {
    Year(u16),
    Month(u16, u8),
    Day(u16, u8, u8),
}

impl PartialDate {
    /// Reads `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, refusing any other form and dates that do not exist.
    fn parse(text: &str) -> Option<Self> {
        let parts: Vec<&str> = text.split('-').collect();
        let date = match parts[..] {
            [year] => Self::Year(number(year, 4)?),
            [year, month] => Self::Month(number(year, 4)?, number(month, 2)?.try_into().ok()?),
            [year, month, day] => Self::Day(
                number(year, 4)?,
                number(month, 2)?.try_into().ok()?,
                number(day, 2)?.try_into().ok()?,
            ),
            _ => return None,
        };
        date.exists().then_some(date)
    }

    fn exists(self) -> bool {
        let (year, month, day) = match self {
            Self::Year(year) => (year, 1, 1),
            Self::Month(year, month) => (year, month, 1),
            Self::Day(year, month, day) => (year, month, day),
        };
        year >= 1 && (1..=12).contains(&month) && day >= 1 && day <= days_in(year, month)
    }

    /// The first day the Partial Date could be, as `YYYY-MM-DD`, and its precision; how the database stores it. See ADR 0010
    pub fn stored(self) -> (String, DatePrecision) {
        match self {
            Self::Year(year) => (format!("{year:04}-01-01"), DatePrecision::Year),
            Self::Month(year, month) => (format!("{year:04}-{month:02}-01"), DatePrecision::Month),
            Self::Day(year, month, day) => {
                (format!("{year:04}-{month:02}-{day:02}"), DatePrecision::Day)
            }
        }
    }

    /// The Partial Date the database stores as `first_day` (`YYYY-MM-DD`) and `precision`, which its CHECKs keep canonical.
    pub fn from_stored(first_day: &str, precision: DatePrecision) -> Option<Self> {
        let date = Self::parse(first_day)?;
        let Self::Day(year, month, day) = date else {
            return None;
        };
        Some(match precision {
            DatePrecision::Year => Self::Year(year),
            DatePrecision::Month => Self::Month(year, month),
            DatePrecision::Day => Self::Day(year, month, day),
        })
    }
}

/// `text` as a number if it is exactly `digits` ASCII digits.
fn number(text: &str, digits: usize) -> Option<u16> {
    (text.len() == digits && text.bytes().all(|byte| byte.is_ascii_digit()))
        .then(|| text.parse().ok())
        .flatten()
}

fn days_in(year: u16, month: u8) -> u8 {
    match month {
        4 | 6 | 9 | 11 => 30,
        2 if year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400)) => {
            29
        }
        2 => 28,
        _ => 31,
    }
}

impl fmt::Display for PartialDate {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Year(year) => write!(f, "{year:04}"),
            Self::Month(year, month) => write!(f, "{year:04}-{month:02}"),
            Self::Day(year, month, day) => write!(f, "{year:04}-{month:02}-{day:02}"),
        }
    }
}

impl TryFrom<String> for PartialDate {
    type Error = String;

    fn try_from(text: String) -> Result<Self, Self::Error> {
        Self::parse(&text).ok_or_else(|| {
            format!("{text:?} is not a Partial Date: use YYYY, YYYY-MM or YYYY-MM-DD")
        })
    }
}

impl From<PartialDate> for String {
    fn from(date: PartialDate) -> Self {
        date.to_string()
    }
}

impl PartialDate {
    /// The Partial Date stored as `first_day` (`YYYY-MM-DD`) and `precision`, or none when both are null; the database's CHECKs keep them canonical. See ADR 0010
    pub fn read_stored(
        first_day: Option<String>,
        precision: Option<DatePrecision>,
    ) -> Result<Option<Self>, sqlx::Error> {
        let (Some(first_day), Some(precision)) = (first_day, precision) else {
            return Ok(None);
        };
        Self::from_stored(&first_day, precision)
            .map(Some)
            .ok_or_else(|| {
                sqlx::Error::Decode(format!("Partial Date {first_day:?} cannot be read").into())
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stored_dates_read_back_as_saved() {
        for text in ["2022", "2022-11", "2022-11-06", "0001", "2024-02-29"] {
            let date = PartialDate::parse(text).unwrap();
            let (first_day, precision) = date.stored();
            assert_eq!(PartialDate::from_stored(&first_day, precision), Some(date));
            assert_eq!(date.to_string(), text);
        }
    }
}
