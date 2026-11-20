# Locks keep only their latest state; saves touching them are refused

A Lock is one row per field (`record_type`, `record_id`, `field`), created the first time the field is Locked. It records who last locked it and, while unlocked, who last unlocked it: unlocking sets `unlocked_by`/`unlocked_at`, re-locking overwrites `locked_by`/`locked_at` and clears them. No longer history is kept; we only need to know which Moderator last changed a Lock.

Only Trusted Contributors, Moderators and Admins may change a Locked field. For anyone else the field is read-only in the website, and the API refuses the whole save if it touches one, rather than applying the rest or making it Pending, so one save is always one Revision with one state.
