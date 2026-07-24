"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, Check, ArrowDown } from "lucide-react";

// One universal instruction for the user's AI assistant. It auto-detects the
// backend (Supabase / Postgres / Neon / RDS / self-hosted / Firebase), looks in
// both the local project and the cloud/deploy server, prepares a read-only
// artifact, and outputs a single block. The human never has to understand any
// of it — they just copy this and paste back whatever the assistant returns.
const AGENT_PROMPT = `I'm using Prooflayer to run a deeper security check on my app, and I need you to pull the check data for me. Please do this fully automatically and don't ask me about technical details:

1. Figure out what backend/database my app uses, and look in both places: the local project (.env, config, ORM/framework settings) and my deployment/cloud server (SSH into the server, docker compose, the .env files of each project under /opt, running database containers).

2. Pull the data in a READ-ONLY way, and PASTE ONLY THE FINAL RESULT VERBATIM, with no explanation:

· If it's Postgres-based (Supabase / Neon / RDS / Railway / self-hosted all count): connect to it using any read-only method you can reach (local, SSH tunnel, or docker exec all work — no need to expose it publicly or give me the address or password), run the single SQL query below, and paste the JSON it outputs to me verbatim:

SELECT json_build_object(
  'prooflayer','pg-audit-v1',
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

· If it's Firebase: just paste the full contents of my firestore.rules file to me verbatim.

Everything is read-only and changes no data; you don't need to give me the database address or password.`;

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
      if (!res.ok) throw new Error(data.error ?? "Security check failed, please try again");
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
          Step 2 · A deeper security check
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-accent)]" /> Let your AI assistant handle it for you
          </CardTitle>
          <CardDescription>
            Some risks hide inside your app where external scans can&apos;t see them. You don&apos;t need any technical knowledge—
            hand the text below to the AI you&apos;re already using (Cursor / Claude Code / Codex, etc.),
            and it will automatically gather and prepare everything. Just paste back whatever it returns to you. <b>Read-only throughout, and discarded right after use.</b>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-6">
            {/* Step 1 — copy */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">① Copy this and send it to your AI assistant</span>
                <span className="text-[11px] text-[var(--color-muted)]">No need to understand it — just click copy</span>
              </div>
              <button
                type="button"
                onClick={copyPrompt}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface-2)] px-4 py-4 text-left transition hover:brightness-110"
              >
                <span className="flex items-center gap-3">
                  <Sparkles size={20} className="text-[var(--color-primary)]" />
                  <span>
                    <span className="block text-sm font-semibold">The instruction to copy for your AI</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      Let it automatically prepare everything the security check needs
                    </span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
            </div>

            <div className="flex justify-center">
              <ArrowDown size={18} className="text-[var(--color-muted)]" />
            </div>

            {/* Step 2 — paste */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                ② Paste what the AI returns to you here
              </label>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={5}
                placeholder="Just paste in the block your AI assistant returns, verbatim"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-critical)]">{error}</p>}

            <Button type="submit" disabled={loading || pasted.trim().length < 8} className="w-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Running security check…
                </>
              ) : (
                "Start security check"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
        Read-only check · Changes none of your data · Discarded after use, never retained
      </p>
    </div>
  );
}
