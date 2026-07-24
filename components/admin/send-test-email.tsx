"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SendTestEmail({ defaultTo }: { defaultTo?: string }) {
  const router = useRouter();
  const [to, setTo] = useState(defaultTo ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setMsg(null);
    const res = await fetch("/api/admin/emails/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      status?: string;
    };
    if (!res.ok) {
      setMsg(data.error ?? "Send failed");
      return;
    }
    setMsg(`Delivery recorded: ${data.status}`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Recipient email"
        className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      <Button size="md" variant="secondary" disabled={pending || !to} onClick={send}>
        Send test email
      </Button>
      {msg ? <p className="text-xs text-[var(--color-muted)] sm:ml-2">{msg}</p> : null}
    </div>
  );
}
