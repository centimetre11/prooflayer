"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

export function AuditForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const url = sp.get("url") ?? "";

  const [kind, setKind] = useState<"connection_string" | "pat">("connection_string");
  const [secret, setSecret] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [persist, setPersist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind, secret, projectRef: projectRef || undefined, persist }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "审计失败");
      router.push(`/report/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "出错了");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-accent)]" /> 深度 RLS 审计
          </CardTitle>
          <CardDescription>
            连接你的 Supabase 做逐表 RLS 审计。<b>只读</b>——我们不会改动你的任何东西。凭证仅在内存中使用，默认<b>用后即焚</b>，绝不回显。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium">应用地址</label>
              <input
                value={url}
                readOnly
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-muted)]"
              />
            </div>

            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setKind("connection_string")}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  kind === "connection_string"
                    ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                只读连接串
              </button>
              <button
                type="button"
                onClick={() => setKind("pat")}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  kind === "pat"
                    ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                Management API Token
              </button>
            </div>

            {kind === "pat" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Project Ref</label>
                <input
                  value={projectRef}
                  onChange={(e) => setProjectRef(e.target.value)}
                  placeholder="如 abcdefghijklmnopqrst"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium">
                <Lock size={13} />
                {kind === "connection_string" ? "只读连接串" : "Management API Token（可吊销）"}
              </label>
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                type="password"
                placeholder={
                  kind === "connection_string"
                    ? "postgresql://readonly:...@db.xxx.supabase.co:5432/postgres"
                    : "sbp_..."
                }
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={persist}
                onChange={(e) => setPersist(e.target.checked)}
              />
              保留凭证以便后续自动复审（信封加密存储，可随时删除）。默认不保留。
            </label>

            {error && <p className="text-sm text-[var(--color-critical)]">{error}</p>}

            <Button type="submit" disabled={loading || !secret} className="w-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> 正在审计…
                </>
              ) : (
                "开始只读审计"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
