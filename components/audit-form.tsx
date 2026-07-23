"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShieldCheck, Copy, Check, Sparkles } from "lucide-react";

const AGENT_PROMPT = `我要给外部安全审计工具 Prooflayer 一个【只读】数据库凭证，用来体检我的 Supabase 的 RLS 配置。请你直接帮我完成，不需要我手动点后台：

1. 在我的 Supabase 数据库里执行下面这段 SQL，创建一个最小权限的只读账号（把密码换成你随机生成的强密码）。可以用 supabase CLI、psql，或项目里已有的数据库连接执行：
   CREATE ROLE prooflayer_ro LOGIN PASSWORD '<随机强密码>';
   GRANT pg_read_all_data TO prooflayer_ro;

2. 从我的项目配置里找到 Supabase 的 project-ref（一般在 SUPABASE_URL、supabase/config.toml 或 .env），拼出下面这行只读连接串，并【只把这一行原样输出给我】，不要附带解释：
   postgresql://prooflayer_ro:<上面的密码>@db.<project-ref>.supabase.co:5432/postgres

约束：只创建只读角色，绝不要暴露 service_role 或任何写权限。审计完成后我会执行 DROP ROLE prooflayer_ro; 删除它。`;

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
      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface-2)]"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {label ?? (copied ? "已复制" : "复制")}
    </button>
  );
}

export function AuditForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const url = sp.get("url") ?? "";

  const [secret, setSecret] = useState("");
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
        body: JSON.stringify({ url, kind: "connection_string", secret, persist }),
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
            把下面这段指令丢给你的 AI 编码助手，它会创建一个<b>只读账号</b>并把连接串给你，粘回来即可。
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

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <Sparkles size={14} className="text-[var(--color-primary)]" />
                ① 复制给你的 AI 编码助手（Cursor / Claude Code / Codex 等）
              </label>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
{AGENT_PROMPT}
                </pre>
                <div className="mt-2">
                  <CopyBtn text={AGENT_PROMPT} label="复制指令" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium">
                <Lock size={13} />② 把助手返回的只读连接串粘到这里
              </label>
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                type="password"
                placeholder="postgresql://prooflayer_ro:...@db.xxx.supabase.co:5432/postgres"
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

      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
        只读会话（强制 <code>SET TRANSACTION READ ONLY</code>）· 凭证仅内存使用 · 默认用后即焚
      </p>
    </div>
  );
}
