"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function SubscribeForm({
  source = "homepage",
  compact = false,
}: {
  source?: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");

    startTransition(async () => {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        already?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "登记失败");
        return;
      }
      setMsg(
        data.already
          ? "这个邮箱已登记过，我们会继续给你发送更新。"
          : "登记成功。我们会把产品更新发到你的邮箱（不会开通控制台）。"
      );
      e.currentTarget.reset();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "flex flex-col gap-2 sm:flex-row"
          : "mx-auto flex max-w-md flex-col gap-3"
      }
    >
      <input
        name="email"
        type="email"
        required
        placeholder="你的邮箱"
        className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      <Button type="submit" disabled={pending} className={compact ? "shrink-0" : "w-full"}>
        {pending ? "提交中…" : "登记收资讯"}
      </Button>
      {error ? (
        <p className="text-xs text-[var(--color-critical)] sm:col-span-2">{error}</p>
      ) : null}
      {msg ? (
        <p className="text-xs text-[var(--color-accent)] sm:col-span-2">{msg}</p>
      ) : null}
    </form>
  );
}
