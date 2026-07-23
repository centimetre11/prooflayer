"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShieldCheck, Copy, Check, Sparkles, Database, Flame } from "lucide-react";

type Backend = "postgres" | "firestore";

const PG_PROMPT = `我要给外部安全审计工具「麋鹿洞察」一个【只读】数据库凭证，用来体检我的后端数据库（RLS / 权限配置）。请你直接完成，别让我手动点后台：

1. 先找到我的数据库连接。两个地方都要看：
   - 本地项目：.env / 环境变量 / ORM 或框架配置
   - 部署/云服务器：SSH 到我的服务器，看 docker compose、/opt 下各项目的 .env、运行中的 postgres 容器
   它可能是 Supabase、Neon、RDS、Railway、Render，或自建的 Postgres 容器——都可以。

2. 用能建角色的管理员连接执行下面 SQL，创建最小权限只读账号（密码用你随机生成的强密码）：
   CREATE ROLE milu_ro LOGIN PASSWORD '<随机强密码>';
   GRANT pg_read_all_data TO milu_ro;

3. 拼出该只读账号的连接串并【只输出这一行】，不要附带解释：
   postgresql://milu_ro:<密码>@<host>:<port>/<database>
   - 托管库（Supabase/Neon/RDS 等）通常需要 SSL → 末尾加 ?sslmode=require
   - 自建且没配 SSL 的库 → 末尾加 ?sslmode=disable
   - 若数据库只在服务器内网/本机监听，请给我一个外部能连上的形式（公网地址，或开一条 SSH 隧道后的 127.0.0.1 地址）

约束：只创建只读角色，绝不暴露写权限或 service_role。审计完成后我会执行 DROP ROLE milu_ro;。`;

const FS_PROMPT = `我要用「麋鹿洞察」审计我的 Firebase Firestore 安全规则。请你在我的项目里找到 firestore.rules（或 firebase.json 里 firestore.rules 指向的文件），把它的【完整内容原样输出给我】，不要改动、不要省略。若本地没有该文件，就用 firebase CLI 从当前项目导出线上生效的规则再给我。`;

function CopyBtn({ text }: { text: string }) {
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
      {copied ? "已复制" : "复制指令"}
    </button>
  );
}

export function AuditForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const url = sp.get("url") ?? "";

  const [backend, setBackend] = useState<Backend>("postgres");
  const [secret, setSecret] = useState("");
  const [persist, setPersist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = backend === "postgres" ? PG_PROMPT : FS_PROMPT;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          kind: backend === "postgres" ? "connection_string" : "firestore_rules",
          secret,
          persist,
        }),
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
          第 2 步 · 深度权限审计
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-accent)]" /> 连接你的后端
          </CardTitle>
          <CardDescription>
            外部扫描看不到数据库内部的访问控制（RLS 策略、<code>anon</code> 授权、Firestore 规则等）。
            选择你的后端类型，把指令丢给你的 AI 编码助手，它会去<b>本地和云服务器</b>找到并准备好审计所需内容，你粘回来即可。
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
              <label className="mb-1 block text-sm font-medium">后端类型</label>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setBackend("postgres");
                    setSecret("");
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left ${
                    backend === "postgres"
                      ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <Database size={14} className="mr-1 inline" /> Postgres
                  <span className="mt-0.5 block text-[11px] text-[var(--color-muted)]">
                    Supabase / Neon / RDS / 自建
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackend("firestore");
                    setSecret("");
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left ${
                    backend === "firestore"
                      ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <Flame size={14} className="mr-1 inline" /> Firebase
                  <span className="mt-0.5 block text-[11px] text-[var(--color-muted)]">
                    Firestore 安全规则
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <Sparkles size={14} className="text-[var(--color-primary)]" />
                ① 复制给你的 AI 编码助手（Cursor / Claude Code / Codex 等）
              </label>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
{prompt}
                </pre>
                <div className="mt-2">
                  <CopyBtn text={prompt} />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium">
                <Lock size={13} />
                {backend === "postgres"
                  ? "② 把助手返回的只读连接串粘到这里"
                  : "② 把助手返回的 firestore.rules 内容粘到这里"}
              </label>
              {backend === "postgres" ? (
                <input
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  type="password"
                  placeholder="postgresql://milu_ro:...@host:5432/db?sslmode=require"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-primary)]"
                />
              ) : (
                <textarea
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  rows={7}
                  placeholder={"rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    ...\n  }\n}"}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
                />
              )}
            </div>

            {backend === "postgres" && (
              <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <input
                  type="checkbox"
                  checked={persist}
                  onChange={(e) => setPersist(e.target.checked)}
                />
                保留凭证以便后续自动复审（信封加密存储，可随时删除）。默认不保留。
              </label>
            )}

            {error && <p className="text-sm text-[var(--color-critical)]">{error}</p>}

            <Button type="submit" disabled={loading || secret.trim().length < 8} className="w-full">
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
        {backend === "postgres"
          ? "只读会话（强制 SET TRANSACTION READ ONLY）· 凭证仅内存使用 · 默认用后即焚"
          : "仅静态分析规则文本 · 不连接你的 Firebase · 内容不回显"}
      </p>
    </div>
  );
}
