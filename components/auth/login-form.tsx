"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    params.get("error") === "CredentialsSignin"
      ? "Incorrect email or password"
      : params.get("error") === "inactive"
        ? "Your account is not active. Please contact an administrator."
        : null
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Incorrect email or password, or your account is not yet active");
        return;
      }
      // Route admins straight to the management console, users to the app console.
      let dest = "/dashboard";
      try {
        const session = await fetch("/api/auth/session").then((r) => r.json());
        if (session?.user?.role === "ADMIN") dest = "/admin";
      } catch {
        // fall back to /dashboard
      }
      router.push(dest);
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
          autoComplete="current-password"
          placeholder="At least 8 characters"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-[var(--color-muted)]">
        Don’t have an account?{" "}
        <Link href="/register" className="text-[var(--color-primary)] hover:underline">
          Create a console account
        </Link>
      </p>
    </form>
  );
}
