"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

export function EvidenceVerify({ appId }: { appId: string }) {
  const [result, setResult] = useState<
    { ok: boolean; length: number; brokenAt?: number } | null
  >(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/${appId}/verify`);
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" size="sm" onClick={verify} disabled={loading}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
        Verify evidence chain integrity
      </Button>
      {result && (
        <span
          className={`inline-flex items-center gap-1 text-sm ${
            result.ok ? "text-[var(--color-accent)]" : "text-[var(--color-critical)]"
          }`}
        >
          {result.ok ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
          {result.ok
            ? `Intact: ${result.length} records, hash chain untampered`
            : `Anomaly found: record #${result.brokenAt} does not match`}
        </span>
      )}
    </div>
  );
}
