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
      setMsg(data.error ?? "Trigger failed");
      return;
    }
    setMsg(
      `Digest complete: sent ${data.sent ?? 0} · skipped ${data.skipped ?? 0} · failed ${data.failed ?? 0}`
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="secondary" disabled={pending} onClick={run}>
        Send digest now
      </Button>
      {msg ? <p className="text-xs text-[var(--color-muted)]">{msg}</p> : null}
    </div>
  );
}
