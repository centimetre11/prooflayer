"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Pref = {
  emailAlerts: boolean;
  weeklyDigest: boolean;
  scanComplete: boolean;
};

export function NotificationSettings() {
  const [pref, setPref] = useState<Pref | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((d: Pref) => setPref(d))
      .catch(() => setMsg("Failed to load"));
  }, []);

  async function save() {
    if (!pref) return;
    setMsg(null);
    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pref),
    });
    if (!res.ok) {
      setMsg("Failed to save");
      return;
    }
    setMsg("Saved");
    startTransition(() => undefined);
  }

  if (!pref) {
    return <p className="text-sm text-[var(--color-muted)]">Loading notification preferences…</p>;
  }

  const rows: { key: keyof Pref; label: string; hint: string }[] = [
    {
      key: "emailAlerts",
      label: "High-severity alert emails",
      hint: "Sent when monitoring detects a CRITICAL/HIGH regression",
    },
    {
      key: "weeklyDigest",
      label: "Weekly security digest",
      hint: "A Monday summary of each app's score and open alerts",
    },
    {
      key: "scanComplete",
      label: "Security check completion notice",
      hint: "Sends a results summary after a scan finishes (off by default)",
    },
  ];

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <label
          key={row.key}
          className="flex cursor-pointer items-start justify-between gap-4"
        >
          <span>
            <span className="block text-sm font-medium">{row.label}</span>
            <span className="block text-xs text-[var(--color-muted)]">
              {row.hint}
            </span>
          </span>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            checked={pref[row.key]}
            disabled={pending}
            onChange={(e) =>
              setPref((p) => (p ? { ...p, [row.key]: e.target.checked } : p))
            }
          />
        </label>
      ))}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending}>
          Save preferences
        </Button>
        {msg ? <span className="text-xs text-[var(--color-muted)]">{msg}</span> : null}
      </div>
    </div>
  );
}
