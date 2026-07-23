"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";

export function MonitoringToggle({
  appId,
  initial,
}: {
  appId: string;
  initial: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}/monitoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.monitoringEnabled);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        enabled
          ? "border-[var(--color-accent)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] text-[var(--color-muted)]"
      }`}
    >
      {enabled ? <Bell size={15} /> : <BellOff size={15} />}
      {enabled ? "每日监测：开" : "每日监测：关"}
    </button>
  );
}
