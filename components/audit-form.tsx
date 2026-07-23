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
const AGENT_PROMPT = `我在用 Prooflayer 给我的应用做一次更深入的安全体检，需要你帮我准备它要的东西。请你全自动完成，不要问我技术细节：

1. 判断我的应用用的是什么后端/数据库，并且在两个地方都找：
   - 本地项目（.env、配置文件、ORM/框架设置）
   - 我的部署 / 云服务器（SSH 进服务器、docker compose、/opt 下各项目的 .env、正在运行的数据库容器）

2. 按类型准备【只读】的体检材料，并且【只把最终这一段原样输出给我，不要任何解释】：
   · 如果是 Postgres 系（Supabase / Neon / RDS / Railway / 自建都算）：先执行
       CREATE ROLE prooflayer_ro LOGIN PASSWORD '<你生成的随机强密码>';
       GRANT pg_read_all_data TO prooflayer_ro;
     再输出这一行只读连接串（托管库结尾加 ?sslmode=require；自建没配 SSL 的加 ?sslmode=disable；只在内网的话给我一个外部能连上的形式，比如公网地址或 SSH 隧道后的 127.0.0.1）：
       postgresql://prooflayer_ro:<密码>@<host>:<port>/<database>
   · 如果是 Firebase：直接把我的 firestore.rules 文件的完整原文输出给我。

约束：只给只读，绝不暴露写权限、service_role 或任何管理员密钥。体检完成后我会自己删掉这个只读账号。`;

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
      if (!res.ok) throw new Error(data.error ?? "体检失败，请重试");
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
          第 2 步 · 更深一层体检
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-accent)]" /> 让你的 AI 助手替你搞定
          </CardTitle>
          <CardDescription>
            有些风险藏在应用内部，外部扫描看不到。你不用懂任何技术——
            把下面这段交给你正在用的 AI（Cursor / Claude Code / Codex 等），
            它会自动查好、准备好，你把它给你的结果贴回来就行。<b>全程只读，用完即焚。</b>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-6">
            {/* Step 1 — copy */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">① 复制这段，发给你的 AI 助手</span>
                <span className="text-[11px] text-[var(--color-muted)]">不用看懂，点复制就行</span>
              </div>
              <button
                type="button"
                onClick={copyPrompt}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface-2)] px-4 py-4 text-left transition hover:brightness-110"
              >
                <span className="flex items-center gap-3">
                  <Sparkles size={20} className="text-[var(--color-primary)]" />
                  <span>
                    <span className="block text-sm font-semibold">复制给 AI 的指令</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      让它自动准备好体检所需的一切
                    </span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "已复制" : "复制"}
                </span>
              </button>
            </div>

            <div className="flex justify-center">
              <ArrowDown size={18} className="text-[var(--color-muted)]" />
            </div>

            {/* Step 2 — paste */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                ② 把 AI 回给你的内容贴到这里
              </label>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={5}
                placeholder="把 AI 助手返回的那一段原样贴进来即可"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-critical)]">{error}</p>}

            <Button type="submit" disabled={loading || pasted.trim().length < 8} className="w-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> 正在体检…
                </>
              ) : (
                "开始体检"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
        只读检查 · 不改动你的任何数据 · 用完即焚，不留存
      </p>
    </div>
  );
}
