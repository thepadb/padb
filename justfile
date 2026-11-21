# Local development database; matches compose.yaml
export DB_PORT := env("DB_PORT", "5432")
export DATABASE_URL := env("DATABASE_URL", "postgres://padb:padb@localhost:" + DB_PORT + "/padb")

[private]
default:
    @just --list


##### Development #####

# Install dependencies
[group("Development")]
install:
    pnpm install

# Run the API: public on port 3000, internal on localhost:3001
[group("Development")]
api:
    cargo run -p padb-api

# Run the website on localhost:3100
[group("Development")]
website:
    pnpm --filter @padb/website dev

# Regenerate the API client from the running API's OpenAPI spec (set API_URL if not localhost:3000)
[group("Development")]
generate:
    pnpm --filter @padb/api-client generate

# Delete issue 7's worktree and branch with `just cleanup 7`, once its commits are all on origin/main; its prototype stays
[group("Development")]
cleanup issue:
    #!/usr/bin/env bash
    set -euo pipefail
    # `7` finds its only `7-*` branch, leaving `7-prototype` alone.
    branch=$(git branch --format='%(refname:short)' | grep -E '^{{issue}}-' | grep -v -- '-prototype$' || true)
    if [[ -z "$branch" ]]; then
        echo "Failed to find a branch for issue {{issue}}."
        exit 1
    fi
    if [[ $(grep -c . <<< "$branch") -gt 1 ]]; then
        echo "Several branches match issue {{issue}}:"
        echo "$branch"
        exit 1
    fi
    # Fetched, not pulled, so main's checkout is never touched, from whichever worktree it's run.
    git fetch --quiet origin main
    # Compares commits by patch, so rebase merges count and main can have moved on since.
    if git cherry origin/main "$branch" | grep -q '^+'; then
        echo "Keeping $branch: it has commits not on origin/main."
        exit 1
    fi
    root=$(git worktree list | awk '$1 ~ "/worktrees/{{issue}}$" {print $1}')
    if [[ -n "$root" ]]; then
        git worktree remove "$root"
        echo "Removed $root"
    fi
    git branch -D "$branch"



##### Database #####

# Start local Postgres in the background
[group("Database")]
serve:
    docker compose up -d --wait

# Stop local services
[group("Database")]
down:
    docker compose down

# Apply database migrations (needs sqlx-cli)
[group("Database")]
migrate:
    sqlx migrate run --source apps/api/migrations


##### Checks #####

# Check formatting and lints
[group("Checks")]
lint:
    cargo fmt --all --check
    cargo clippy --workspace --all-targets --locked -- -D warnings
    pnpm lint
    pnpm -r --if-present typecheck

# Fix formatting and safe lint issues
[group("Checks")]
format:
    cargo fmt --all
    pnpm format

# Run all tests
[group("Checks")]
test:
    cargo test --workspace --locked
    pnpm -r --if-present test
