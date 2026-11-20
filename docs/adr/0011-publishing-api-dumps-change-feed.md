# Data is published three ways, from an allowlist, under contributor terms

Code and data are published separately. The deployed site always runs a commit from the public repository, and its footer links to that commit, satisfying AGPL-3.0.

The database is published under ODbL 1.0 three ways:

* **API:** live reads, as used by the website (ADR 0001).
* **Dumps:** a regular full export of public data (JSON, CSV and SQL) with the licence and attribution text, served from object storage with free egress rather than the application server, so downloads never compete with the site.
* **Change Feed:** `/v1/changes?after=<cursor>`, one entry each time a public record changes (accepted, Rejected, Merged or Deleted), in order, with its current state, so mirrors stay current without re-downloading a Dump or replaying Revisions. Entries are written in the same transaction as the change, so none are missed.

Dumps and the Change Feed are built from an allowlist of public fields, never a copy of the database, so new private columns stay private by default. Never published: anything in the `auth` schema (email addresses, password hashes, passkeys, sessions), IP addresses, and anything removed by a Delete. Revisions carry only the Contributor's public username.

Every account accepts contributor terms before its first edit: contributions are licensed under ODbL 1.0, and the project may relicense the database under another free and open data licence. Any change is announced publicly, with time for contributors to object, before it takes effect. It applies only from then on: data already published under ODbL stays ODbL, and imported data keeps its source's licence. This makes publishing contributors' edits lawful and keeps a future licence change possible without tracing every contributor (ADR 0002).

Dumps are not backups. The database is also backed up privately and encrypted, including the data Dumps leave out.
