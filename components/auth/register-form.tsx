"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      const login = await signIn("credentials", {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        redirect: false,
      });
      if (login?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-[color-mix(in_srgb,var(--color-critical)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-critical)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-critical)]">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)]">Name</label>
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="Jane Doe"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)]">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)]">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Sign up and open console"}
      </Button>
      <p className="text-center text-xs text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-primary)] hover:underline">
          Sign in
        </Link>
        {" · "}
        Just want updates?{" "}
        <Link href="/#subscribe" className="text-[var(--color-primary)] hover:underline">
          Subscribe with email
        </Link>
      </p>
    </form>
  );
}
