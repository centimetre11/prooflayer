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
        setError(data.error ?? "Sign-up failed");
        return;
      }
      setMsg(
        data.already
          ? "This email is already signed up—we'll keep sending you updates."
          : "You're signed up. We'll send product updates to your email (no console account created)."
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
        placeholder="Your email"
        className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      <Button type="submit" disabled={pending} className={compact ? "shrink-0" : "w-full"}>
        {pending ? "Submitting…" : "Sign up for updates"}
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
