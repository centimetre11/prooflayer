"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Lock,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Database,
} from "lucide-react";

const RO_ROLE_SQL = `-- 在 Supabase SQL Editor 执行：创建一个只读账号给 Prooflayer
CREATE ROLE prooflayer_ro LOGIN PASSWORD '改成一个强密码';
GRANT pg_read_all_data TO prooflayer_ro;`;

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface-2)]"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {label ?? (copied ? "已复制" : "复制")}
    </button>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
    >
      {children}
      <ExternalLink size={12} />
    </a>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-bold text-white">
        {n}
      </span>
      <div className="text-sm leading-relaxed">{children}</div>
    </li>
  );
}

export function AuditForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const url = sp.get("url") ?? "";

  const [kind, setKind] = useState<"connection_string" | "pat">("pat");
  const [secret, setSecret] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [persist, setPersist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connTemplate = `postgresql://prooflayer_ro:你的密码@db.${
    projectRef || "<project-ref>"
  }.supabase.co:5432/postgres`;

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
      <div className="mb-4">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
          第 2 步 · 深度 RLS 审计
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-accent)]" /> 连接你的 Supabase
          </CardTitle>
          <CardDescription>
            外部扫描看不到数据库内部的 RLS 策略、<code>anon</code> 授权和 SECURITY DEFINER 函数。
            按下面的步骤在你自己的 Supabase 里生成一个<b>只读</b>凭证，我们就能逐表体检。
            <b>只读、用后即焚、绝不回显。</b>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium">被审计的应用</label>
              <input
                value={url}
                readOnly
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-muted)]"
              />
            </div>

            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setKind("pat")}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  kind === "pat"
                    ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                <KeyRound size={14} className="mr-1 inline" /> Access Token（推荐）
              </button>
              <button
                type="button"
                onClick={() => setKind("connection_string")}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  kind === "connection_string"
                    ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                <Database size={14} className="mr-1 inline" /> 只读连接串
              </button>
            </div>

            {/* ---- 引导：在自己的 Supabase 里怎么配 ---- */}
            {kind === "pat" ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="mb-3 text-sm font-semibold">在你的 Supabase 里操作（约 1 分钟）</p>
                <ol className="space-y-3">
                  <Step n={1}>
                    打开{" "}
                    <ExtLink href="https://supabase.com/dashboard/account/tokens">
                      Account → Access Tokens
                    </ExtLink>{" "}
                    ，点 <b>Generate new token</b>，复制以 <code>sbp_</code> 开头的字符串，
                    粘贴到下面「Access Token」。
                  </Step>
                  <Step n={2}>
                    打开{" "}
                    <ExtLink href="https://supabase.com/dashboard/project/_/settings/general">
                      Project Settings → General
                    </ExtLink>{" "}
                    ，复制 <b>Reference ID</b>（20 位），粘贴到下面「Project Ref」。
                  </Step>
                  <Step n={3}>点最下方「开始只读审计」。查完可随时在 Supabase 删除该 Token。</Step>
                </ol>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="mb-3 text-sm font-semibold">在你的 Supabase 里创建只读账号（最安全）</p>
                <ol className="space-y-3">
                  <Step n={1}>
                    打开{" "}
                    <ExtLink href="https://supabase.com/dashboard/project/_/sql/new">
                      SQL Editor
                    </ExtLink>{" "}
                    ，执行这段（记得改密码）：
                    <div className="mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2">
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
{RO_ROLE_SQL}
                      </pre>
                      <div className="mt-1">
                        <CopyBtn text={RO_ROLE_SQL} label="复制 SQL" />
                      </div>
                    </div>
                  </Step>
                  <Step n={2}>
                    在{" "}
                    <ExtLink href="https://supabase.com/dashboard/project/_/settings/general">
                      Project Settings → General
                    </ExtLink>{" "}
                    拿到 Reference ID，填到这里 → 自动拼好连接串模板：
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={projectRef}
                        onChange={(e) => setProjectRef(e.target.value)}
                        placeholder="project-ref，如 abcdefghijklmnopqrst"
                        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div className="mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2">
                      <code className="block overflow-x-auto whitespace-nowrap font-mono text-[11px]">
                        {connTemplate}
                      </code>
                      <div className="mt-1">
                        <CopyBtn text={connTemplate} label="复制模板" />
                      </div>
                    </div>
                  </Step>
                  <Step n={3}>把改好密码的连接串粘贴到下面「只读连接串」，点「开始只读审计」。</Step>
                </ol>
              </div>
            )}

            {/* ---- PAT 模式的 Project Ref 输入 ---- */}
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
                {kind === "connection_string" ? "只读连接串" : "Access Token（可随时吊销）"}
              </label>
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                type="password"
                placeholder={
                  kind === "connection_string"
                    ? "postgresql://prooflayer_ro:...@db.xxx.supabase.co:5432/postgres"
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

            <Button
              type="submit"
              disabled={loading || !secret || (kind === "pat" && !projectRef)}
              className="w-full"
            >
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

      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
        只读会话（强制 <code>SET TRANSACTION READ ONLY</code>）· 凭证仅内存使用 · 默认用后即焚
      </p>
    </div>
  );
}
