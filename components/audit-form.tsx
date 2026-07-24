"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, Check, ArrowDown } from "lucide-react";

// One universal instruction for the user's AI assistant. It auto-detects the
// backend (Supabase / Postgres / Neon / RDS / self-hosted / Firebase), looks in
// both the local project and the cloud/deploy server, runs read-only checks
// wherever it can reach the database, and returns a single block. The human
// never has to understand any of it — they just copy this and paste back
// whatever the assistant returns. Nothing connects from our side.
const AGENT_PROMPT = `I'm running a deeper security check on my app with InsightElk. Please gather what it needs, fully automatically, without asking me for technical details:

1. Figure out what backend / database my app uses, and look in BOTH places: my local project (.env, config, ORM/framework settings) AND my deploy/cloud server (SSH in, docker compose, .env files under /opt, running database containers).

2. Collect the data READ-ONLY, and output ONLY the final result verbatim, with no explanation:

· If it's Postgres-family (Supabase / Neon / RDS / Railway / self-hosted all count): connect to it read-only in whatever way you can reach it (local, SSH tunnel, docker exec — no need to expose it publicly, and no need to give me any address or password), run the single SQL below, and paste back exactly the JSON it prints:

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

· If it's Firebase: just paste back the full contents of my firestore.rules file, verbatim.

Read-only throughout — do not modify anything, and you don't need to send me any database address or password.`;

export function AuditForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const url = sp.get("url") ?? "";

  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function copyPrompt() {
    navigator.clipboard.writeText(AGENT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind: "auto", secret: pasted.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check failed, please try again");
      router.push(`/report/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
          Deeper check · your AI does it
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-accent)]" /> Let your AI handle it
          </CardTitle>
          <CardDescription>
            Some risks hide inside your app where external scans can&rsquo;t reach. You don&rsquo;t need any
            technical knowledge — hand the instruction below to the AI you already use (Cursor / Claude
            Code / Codex, etc.). It figures out your backend, runs read-only checks, and gives you a
            result to paste back. <b>Read-only throughout, and discarded right after use.</b>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium">App being checked</label>
              <input
                value={url}
                readOnly
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-muted)]"
              />
            </div>

            {/* Single action: hand it to the AI, bring back the result. */}
            <button
              type="button"
              onClick={copyPrompt}
              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface-2)] px-4 py-4 text-left transition hover:brightness-110"
            >
              <span className="flex items-center gap-3">
                <Sparkles size={20} className="text-[var(--color-primary)]" />
                <span>
                  <span className="block text-sm font-semibold">Copy the instruction for your AI</span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    Let it prepare and run everything the check needs — no need to read it
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </span>
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
              <ArrowDown size={16} /> then bring back what it returns
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Paste the AI&rsquo;s result here</label>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={5}
                placeholder="Paste in the block your AI assistant returns, verbatim"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-critical)]">{error}</p>}

            <Button type="submit" disabled={loading || pasted.trim().length < 8} className="w-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Checking…
                </>
              ) : (
                "Start security check"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
        Read-only · never changes your data · nothing stored after use
      </p>
    </div>
  );
}
