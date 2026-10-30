#!/usr/bin/env bash
# Runs the migration and RLS checks against a throwaway local Postgres container.
# Never touches the remote Supabase project.
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME=replog-pg-check
PORT=${PORT:-55432}
export PGPASSWORD=local-only
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD="$PGPASSWORD" -p "$PORT:5432" postgres:16 >/dev/null
trap 'docker stop "$NAME" >/dev/null' EXIT
for _ in $(seq 1 30); do psql -h localhost -p "$PORT" -U postgres -c "select 1" >/dev/null 2>&1 && break; sleep 1; done
psql -h localhost -p "$PORT" -U postgres -q -f supabase/tests/supabase-stub.sql
psql -h localhost -p "$PORT" -U postgres -q -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
psql -h localhost -p "$PORT" -U postgres -At -f supabase/tests/rls-checks.sql
echo "--- 0002_app.sql"
psql -h localhost -p "$PORT" -U postgres -q -v ON_ERROR_STOP=1 -f supabase/migrations/0002_app.sql
psql -h localhost -p "$PORT" -U postgres -q -At -v ON_ERROR_STOP=1 -f supabase/tests/app-checks.sql
