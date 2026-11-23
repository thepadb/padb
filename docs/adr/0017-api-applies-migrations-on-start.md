# The API applies its migrations when it starts

Each API binary embeds the migrations it was built with and applies any that are missing before it listens. A deploy is then just "start the new image": no separate migration job, and the schema can never be older than the code running against it. sqlx takes a Postgres advisory lock while migrating, so several instances starting at once apply each migration only once.

The cost is that migrations must stay backwards compatible with the previous release. While a deploy rolls over, the old instance runs against the new schema, and rolling back an image does not roll back its migrations. So a migration only adds; dropping or renaming a column waits for a later release once no running code reads it.

We chose this over a separate migrate step in the deploy pipeline because Dokploy has no simple hook for one-off jobs, and a forgotten migration would break staging silently.
