#!/usr/bin/env bash
# InsightElk - recurring deep security check.
#
# Runs the read-only audit wherever it can reach your database and POSTs the
# result to your app's private ingest URL. Schedule it (cron / CI) so InsightElk
# keeps watching for deeper regressions over time (RLS rolled back, new public
# grants, Firestore rules loosened, ...).
#
# Read-only throughout - it never modifies anything, and no DB address or
# password ever leaves your environment.
#
# Usage:
#   Postgres (Supabase / Neon / RDS / Railway / self-hosted):
#     INSIGHTELK_INGEST_URL=https://insightelk.com/api/ingest/<token> \
#     DATABASE_URL='postgres://user:pass@host:5432/db' \
#     ./insightelk-deep-check.sh
#
#   Firebase (Firestore rules):
#     INSIGHTELK_INGEST_URL=https://insightelk.com/api/ingest/<token> \
#     FIRESTORE_RULES=./firestore.rules \
#     ./insightelk-deep-check.sh
#
#   docker exec Postgres (no exposed port):
#     INSIGHTELK_INGEST_URL=... PGCONTAINER=my-db-1 PGUSER=postgres PGDB=mydb \
#     ./insightelk-deep-check.sh
#
# Suggested cron (weekly, Mondays 03:00):
#   0 3 * * 1  INSIGHTELK_INGEST_URL=... DATABASE_URL=... /opt/insightelk-deep-check.sh
set -euo pipefail

URL="${INSIGHTELK_INGEST_URL:?set INSIGHTELK_INGEST_URL to the private ingest URL for your app}"

post() {
  # Reads the payload from stdin and POSTs it verbatim to the ingest URL.
  curl -fsS -X POST -H 'Content-Type: application/json' --data-binary @- "$URL"
  echo
}

if [ -n "${FIRESTORE_RULES:-}" ]; then
  echo "[insightelk] posting firestore.rules from $FIRESTORE_RULES"
  curl -fsS -X POST --data-binary @"$FIRESTORE_RULES" "$URL"; echo
  echo "[insightelk] done"
  exit 0
fi

# Spool the single read-only SQL statement to a temp file (emits one JSON row).
SQL_FILE="$(mktemp)"
trap 'rm -f "$SQL_FILE"' EXIT
cat > "$SQL_FILE" <<'SQL'
SELECT json_build_object(
  'insightelk','pg-audit-v1',
  'tables',(SELECT coalesce(json_agg(row_to_json(x)),'[]'::json) FROM (
    SELECT n.nspname AS schemaname, c.relname AS tablename, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')) x),
  'policies',(SELECT coalesce(json_agg(row_to_json(x)),'[]'::json) FROM (
    SELECT schemaname,tablename,policyname,cmd,qual,with_check,roles FROM pg_policies) x),
  'grants',(SELECT coalesce(json_agg(row_to_json(x)),'[]'::json) FROM (
    SELECT table_schema,table_name,privilege_type,grantee FROM information_schema.role_table_grants
    WHERE grantee IN ('anon','authenticated') AND table_schema NOT IN ('pg_catalog','information_schema')) x),
  'functions',(SELECT coalesce(json_agg(row_to_json(x)),'[]'::json) FROM (
    SELECT p.proname,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') x)
);
SQL

if [ -n "${PGCONTAINER:-}" ]; then
  echo "[insightelk] running audit via docker exec on $PGCONTAINER"
  docker exec -i "$PGCONTAINER" psql -U "${PGUSER:-postgres}" -d "${PGDB:-postgres}" -tA -f - < "$SQL_FILE" | post
elif [ -n "${DATABASE_URL:-}" ]; then
  echo "[insightelk] running audit via DATABASE_URL"
  psql "$DATABASE_URL" -tA -f "$SQL_FILE" | post
else
  echo "error: set one of DATABASE_URL, PGCONTAINER, or FIRESTORE_RULES" >&2
  exit 1
fi

echo "[insightelk] done"
