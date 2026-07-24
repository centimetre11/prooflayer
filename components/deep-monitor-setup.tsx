"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, Radar, Loader2, RefreshCw, Terminal } from "lucide-react";

const AUDIT_SQL = `SELECT json_build_object(
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
);`;

function recurringPrompt(ingestUrl: string): string {
  return `Set up a recurring security check for my app with InsightElk, fully automatically — don't ask me for technical details.

Re-run the SAME read-only check you did before, on a schedule (about once a week), wherever you can reach my database — my deploy/cloud server or CI both work. Pick whatever scheduler fits (a cron entry on my server, a GitHub Actions workflow, etc.).

Each run, POST the verbatim result to this private URL (no login needed — it identifies my app):

${ingestUrl}

· If it's Postgres-family (Supabase / Neon / RDS / Railway / self-hosted): run the read-only SQL below and POST its JSON output as the request body, e.g.
  psql "$DATABASE_URL" -tAc "<the SQL below, on one line>" | curl -sS -X POST -H "Content-Type: application/json" --data-binary @- "${ingestUrl}"

${AUDIT_SQL}

· If it's Firebase: POST the full contents of firestore.rules as the request body, e.g.
  curl -sS -X POST --data-binary @firestore.rules "${ingestUrl}"

Read-only throughout — don't modify anything, and you don't need to send me any database address or password.`;
}

// A ready-to-run script with the ingest URL baked in — for anyone who'd rather
// drop a file into cron/CI than have the AI wire it up. Postgres: set
// DATABASE_URL. Firebase: set FIRESTORE_RULES=./firestore.rules.
function readyScript(ingestUrl: string): string {
  return `#!/usr/bin/env bash
# InsightElk — recurring deep security check. Schedule this (cron / CI).
# Postgres: set DATABASE_URL   |   Firebase: set FIRESTORE_RULES=./firestore.rules
# Read-only; nothing leaves your environment except the audit result.
set -euo pipefail
URL="${ingestUrl}"

if [ -n "\${FIRESTORE_RULES:-}" ]; then
  curl -fsS -X POST --data-binary @"\$FIRESTORE_RULES" "\$URL"; echo; exit 0
fi

SQL_FILE="\$(mktemp)"; trap 'rm -f "\$SQL_FILE"' EXIT
cat > "\$SQL_FILE" <<'SQL'
${AUDIT_SQL}
SQL
psql "\${DATABASE_URL:?set DATABASE_URL or FIRESTORE_RULES}" -tA -f "\$SQL_FILE" \\
  | curl -fsS -X POST -H 'Content-Type: application/json' --data-binary @- "\$URL"; echo`;
}

function cronLine(): string {
  return `0 3 * * 1  DATABASE_URL='postgres://user:pass@host:5432/db' /opt/insightelk-deep-check.sh`;
}

export function DeepMonitorSetup({
  appId,
  initialEnabled,
  initialIngestUrl,
  lastIngestAt,
  highlight,
}: {
  appId: string;
  initialEnabled: boolean;
  initialIngestUrl: string | null;
  lastIngestAt: string | null;
  highlight?: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [ingestUrl, setIngestUrl] = useState<string | null>(initialIngestUrl);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"prompt" | "url" | "script" | "cron" | null>(null);
  const [showScript, setShowScript] = useState(false);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/apps/${appId}/deep-monitoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(data.deepMonitoringEnabled);
        if (data.ingestToken) {
          setIngestUrl(`${window.location.origin}/api/ingest/${data.ingestToken}`);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function copy(what: "prompt" | "url" | "script" | "cron") {
    if (!ingestUrl) return;
    const text =
      what === "prompt"
        ? recurringPrompt(ingestUrl)
        : what === "script"
          ? readyScript(ingestUrl)
          : what === "cron"
            ? cronLine()
            : ingestUrl;
    navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <Card className={highlight ? "border-[var(--color-primary)]" : undefined}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-primary)]">
              <Radar size={18} />
            </span>
            <div>
              <div className="text-sm font-semibold">Continuous deep monitoring</div>
              <p className="mt-1 max-w-xl text-xs text-[var(--color-muted)]">
                Your AI re-runs the same read-only check on a schedule and sends the result back here.
                We diff it against your baseline: new deep risks raise an alert, fixes auto-resolve, and
                every submission is added to your tamper-proof evidence chain.
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              enabled
                ? "bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[var(--color-accent)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
            }`}
          >
            {enabled ? "On" : "Off"}
          </span>
        </div>

        {enabled && ingestUrl ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => copy("prompt")}
              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface-2)] px-4 py-4 text-left transition hover:brightness-110"
            >
              <span className="flex items-center gap-3">
                <Sparkles size={20} className="text-[var(--color-primary)]" />
                <span>
                  <span className="block text-sm font-semibold">
                    Copy the recurring instruction for your AI
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    Hand it to Cursor / Claude Code / Codex once — it sets up the schedule for you
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white">
                {copied === "prompt" ? <Check size={16} /> : <Copy size={16} />}
                {copied === "prompt" ? "Copied" : "Copy"}
              </span>
            </button>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
              <div className="mb-1 text-xs text-[var(--color-muted)]">Private submission URL</div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-xs">{ingestUrl}</code>
                <button
                  type="button"
                  onClick={() => copy("url")}
                  className="shrink-0 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:border-[var(--color-primary)]"
                >
                  {copied === "url" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Advanced: a ready-to-run script for anyone who prefers cron/CI. */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
              <button
                type="button"
                onClick={() => setShowScript((s) => !s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <Terminal size={14} />
                Prefer a ready-to-run script? (drop it into cron / CI yourself)
              </button>
              {showScript && (
                <div className="space-y-3 border-t border-[var(--color-border)] p-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-[var(--color-muted)]">
                        insightelk-deep-check.sh · URL already filled in
                      </span>
                      <button
                        type="button"
                        onClick={() => copy("script")}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:border-[var(--color-primary)]"
                      >
                        {copied === "script" ? <Check size={12} /> : <Copy size={12} />}
                        {copied === "script" ? "Copied" : "Copy script"}
                      </button>
                    </div>
                    <pre className="max-h-48 overflow-auto rounded-md bg-[var(--color-surface-2)] p-2 font-mono text-[10px] leading-relaxed text-[var(--color-muted)]">
                      {readyScript(ingestUrl)}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-[var(--color-muted)]">Weekly cron example</span>
                      <button
                        type="button"
                        onClick={() => copy("cron")}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:border-[var(--color-primary)]"
                      >
                        {copied === "cron" ? <Check size={12} /> : <Copy size={12} />}
                        {copied === "cron" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <code className="block overflow-auto rounded-md bg-[var(--color-surface-2)] p-2 font-mono text-[10px] text-[var(--color-muted)]">
                      {cronLine()}
                    </code>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
              <span>
                {lastIngestAt
                  ? `Last result received ${lastIngestAt}`
                  : "Waiting for the first scheduled result…"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => call({ rotate: true })}
                  className="inline-flex items-center gap-1 hover:text-[var(--color-foreground)]"
                >
                  <RefreshCw size={12} /> Rotate URL
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => call({ enabled: false })}
                  className="hover:text-[var(--color-critical)]"
                >
                  Turn off
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => call({ enabled: true })}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
            Turn on continuous deep monitoring
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
