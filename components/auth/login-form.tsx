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
      ? "邮箱或密码错误"
      : params.get("error") === "inactive"
        ? "账号未激活，请联系管理员"
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
        setError("邮箱或密码错误，或账号尚未开通");
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
        <label className="text-xs text-[var(--color-muted)]">邮箱</label>
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
        <label className="text-xs text-[var(--color-muted)]">密码</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="至少 8 位"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "登录中…" : "登录"}
      </Button>
      <p className="text-center text-xs text-[var(--color-muted)]">
        还没有账号？{" "}
        <Link href="/register" className="text-[var(--color-primary)] hover:underline">
          注册控制台账号
        </Link>
      </p>
    </form>
  );
}
