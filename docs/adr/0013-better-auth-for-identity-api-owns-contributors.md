# Better Auth handles identity; the API owns Contributors

One account, stored as two linked rows. Better Auth runs in the website, in its own `auth` schema, and holds the private login details: email, password hash, passkeys and sessions. Sign-in is by email and password, magic link or passkey; there is no social sign-in. The API owns `contributor`: the public username, role, when the Contributor passed review, and bans. A Better Auth hook creates the `contributor` row through the internal API at sign-up.

The website sends the API a short-lived JWT from Better Auth's JWT plugin; the API verifies it against Better Auth's published keys (JWKS) and reads only the user ID from it. Roles and bans are looked up in `contributor` on every write, so a ban takes effect immediately; only revoking a stolen session waits for its token to expire.

We chose this over storing roles and usernames in Better Auth's own user table because Rust would then depend on tables whose migrations Better Auth controls, and private login data would sit beside public data that Dumps publish. We chose it over writing auth in Rust because Better Auth already provides magic links and passkeys. This amends ADR 0001: the website owns accounts and sessions, the API owns everything else.

Leaving review is recorded, not calculated: `review_passed_at` is set when a Contributor reaches the Accepted threshold (counted from `revision` at that moment) or a Moderator promotes them, and cleared if they are returned to review, so changing the threshold never changes anyone's standing retroactively.
