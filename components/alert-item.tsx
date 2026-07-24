"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeverityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Severity } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export interface AlertView {
  id: string;
  severity: Severity;
  title: string;
  detail?: string | null;
  state: "OPEN" | "ACK" | "RESOLVED";
  openedAt: string | Date;
}

export function AlertItem({ alert }: { alert: AlertView }) {
  const router = useRouter();
  const [state, setState] = useState(alert.state);
  const [busy, setBusy] = useState(false);

  async function act(action: "ack" | "resolve") {
    setBusy(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-[var(--color-muted)]">
            {relativeTime(alert.openedAt)} · {stateLabel(state)}
          </span>
        </div>
        <div className="mt-1 truncate font-medium">{alert.title}</div>
      </div>
      {state !== "RESOLVED" && (
        <div className="flex gap-2">
          {state === "OPEN" && (
            <Button variant="ghost" size="sm" onClick={() => act("ack")} disabled={busy}>
              Acknowledge
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => act("resolve")} disabled={busy}>
            Mark resolved
          </Button>
        </div>
      )}
    </div>
  );
}

function stateLabel(s: string) {
  return s === "OPEN" ? "Open" : s === "ACK" ? "Acknowledged" : "Resolved";
}
