// Ports of their own, never reused, so tests always run against this checkout's code and not a
// `just website` or `just api` left running from another worktree.
export const websiteUrl = 'http://127.0.0.1:3199';
export const apiUrl = 'http://127.0.0.1:3198';
export const internalApiUrl = 'http://127.0.0.1:3197';

/** A database of its own, emptied by `just test-e2e` before each run, so tests never touch dev data. */
export const databaseUrl = `postgres://padb:padb@localhost:${process.env.DB_PORT ?? '5432'}/padb_e2e`;
