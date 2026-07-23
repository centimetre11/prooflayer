"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

const STAGES = [
  "正在用真实浏览器打开你的应用…",
  "正在抓取前端代码与运行时请求…",
  "正在检查你的数据库门锁（RLS）…",
  "正在扫描泄露的密钥与密码…",
  "正在探测 Auth 与暴露面配置…",
  "正在生成白话报告…",
];

export default function ScanProgress() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2500);

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/${params.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "DONE") {
          clearInterval(poll);
          clearInterval(stageTimer);
          router.replace(`/report/${params.id}`);
        } else if (data.status === "FAILED") {
          clearInterval(poll);
          clearInterval(stageTimer);
          setFailed(data.error ?? "扫描失败");
        }
      } catch {
        /* keep polling */
      }
    }, 1500);

    return () => {
      clearInterval(poll);
      clearInterval(stageTimer);
    };
  }, [params.id, router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5">
      <Card className="w-full">
        <CardContent className="p-10 text-center">
          {failed ? (
            <>
              <ShieldAlert size={40} className="mx-auto text-[var(--color-critical)]" />
              <h1 className="mt-4 text-xl font-semibold">扫描未能完成</h1>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{failed}</p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 text-sm text-[var(--color-primary)] hover:underline"
              >
                返回重试
              </button>
            </>
          ) : (
            <>
              <Loader2 size={40} className="mx-auto animate-spin text-[var(--color-primary)]" />
              <h1 className="mt-4 text-xl font-semibold">正在体检你的应用</h1>
              <p className="mt-2 min-h-6 text-[var(--color-muted)]">{STAGES[stage]}</p>
              <div className="mt-6 space-y-2 text-left">
                {STAGES.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm ${
                      i <= stage ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)] opacity-50"
                    }`}
                  >
                    {i < stage ? (
                      <CheckCircle2 size={16} className="text-[var(--color-accent)]" />
                    ) : i === stage ? (
                      <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-[var(--color-border)]" />
                    )}
                    {s}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
