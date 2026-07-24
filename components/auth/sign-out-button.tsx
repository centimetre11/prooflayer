"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";

export function SignOutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await signOut({ callbackUrl: "/" });
        });
      }}
      className={
        className ??
        "rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-foreground)] hover:border-[var(--color-primary)] disabled:opacity-50"
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
