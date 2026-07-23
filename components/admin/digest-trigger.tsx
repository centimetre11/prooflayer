"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DigestTrigger() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setMsg(null);
    const res = await fetch("/api/admin/emails/digest", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      sent?: number;
      skipped?: number;
      failed?: number;
    };
    if (!res.ok) {
      setMsg(data.error ?? "触发失败");
      return;
    }
    setMsg(
      `周报完成：发送 ${data.sent ?? 0} · 跳过 ${data.skipped ?? 0} · 失败 ${data.failed ?? 0}`
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="secondary" disabled={pending} onClick={run}>
        立即发送周报
      </Button>
      {msg ? <p className="text-xs text-[var(--color-muted)]">{msg}</p> : null}
    </div>
  );
}
