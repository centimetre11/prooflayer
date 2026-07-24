"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Tier, UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";

const TIERS: Tier[] = ["FREE", "INDIE", "TEAM", "ENTERPRISE"];
const ROLES: UserRole[] = ["USER", "ADMIN"];

export function UserActions({
  userId,
  role,
  tier,
}: {
  userId: string;
  role: UserRole;
  tier: Tier;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currentRole, setCurrentRole] = useState(role);
  const [currentTier, setCurrentTier] = useState(tier);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { role?: UserRole; tier?: Tier }) {
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Save failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select
          className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs"
          value={currentRole}
          disabled={pending}
          onChange={(e) => setCurrentRole(e.target.value as UserRole)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs"
          value={currentTier}
          disabled={pending}
          onChange={(e) => setCurrentTier(e.target.value as Tier)}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => save({ role: currentRole, tier: currentTier })}
        >
          Save
        </Button>
      </div>
      {error ? <p className="text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
