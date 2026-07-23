"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ApplicationActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setError(null);
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("拒绝原因（可选，会写入邮件）") ?? undefined;
    }
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "操作失败");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => decide("approve")}
        >
          通过
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => decide("reject")}
        >
          拒绝
        </Button>
      </div>
      {error ? <p className="text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
