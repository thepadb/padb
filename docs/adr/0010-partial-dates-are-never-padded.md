# Partial Dates are never padded; uncertain answers say so

A Partial Date is returned at the precision we know, as reduced-precision ISO 8601 (`"2022"`, `"2022-11"`, `"2022-11-06"`), never padded to a full date: treating `2022` as `2022-01-01` invents precision consumers would trust. Because Partial Dates cannot always be ordered (`2022` vs `2022-11-06`), Status History and other histories are ordered by an explicit sequence; dates are information, not the sort key.

In the database a Partial Date is two columns: its first possible day and its precision (`year`, `month` or `day`), so `2022` is stored as `2022-01-01` + `year`. CHECK constraints keep one canonical form (a year is 1 January, a month is the 1st; both columns null when unknown). This keeps dates indexable and makes the range a Partial Date covers easy to compute; the stored day is never output.

Point-in-time queries answer definitively where the known dates allow, and otherwise return `null` with every Status that could apply, rather than guessing or returning nothing. For example, Nemesis was operating from 1994-03-19, refurbishing from some point in 2022 and operating again from 2024-03-16:

```json
GET /v1/rides/{id}/status?on=2023-06-01
{ "on": "2023-06-01", "status": "refurbishing" }

GET /v1/rides/{id}/status?on=2022-06-15
{ "on": "2022-06-15", "status": null, "possible": ["operating", "refurbishing"] }
```

The second query falls inside 2022, when the change happened on an unknown day, so either Status could be true.
