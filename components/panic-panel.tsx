"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDown, Lock, Sparkles, Loader2 } from "lucide-react";

export interface DossierPreview {
  question: string;
  answer: string;
  status: string;
}

export function PanicPanel({
  appId,
  canExport,
  scanCount,
  monitoringDays,
  evidenceCount,
  preview,
}: {
  appId: string;
  canExport: boolean;
  scanCount: number;
  monitoringDays: number;
  evidenceCount: number;
  preview: DossierPreview[];
}) {
  const [loading, setLoading] = useState(false);
  const [upgrade, setUpgrade] = useState<string | null>(null);

  async function exportDossier() {
    setLoading(true);
    setUpgrade(null);
    try {
      const res = await fetch(`/api/export/${appId}`);
      if (res.status === 402) {
        const data = await res.json();
        setUpgrade(data.message ?? "Upgrade your plan to export");
        return;
      }
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `milu-dossier-${appId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-[var(--color-primary)]/40">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--color-primary)]" />
          <h3 className="font-semibold">Panic moment · Due diligence response package</h3>
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Over the past <b className="text-[var(--color-foreground)]">{monitoringDays}</b> days you have{" "}
          <b className="text-[var(--color-foreground)]">{scanCount}</b> scans and{" "}
          <b className="text-[var(--color-foreground)]">{evidenceCount}</b>{" "}
          evidence records available for your response. When an incident happens or a customer runs due diligence, generate the materials to prove your compliance in one click.
        </p>

        <div className="relative mt-4 space-y-2">
          {preview.map((a, i) => {
            const locked = !canExport && i >= 2;
            return (
              <div
                key={i}
                className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm ${
                  locked ? "select-none blur-sm" : ""
                }`}
              >
                <div className="font-medium">{a.question}</div>
                <div className="mt-1 text-[var(--color-muted)]">{a.answer}</div>
              </div>
            );
          })}
          {!canExport && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center rounded-b-lg bg-gradient-to-t from-[var(--color-surface)] to-transparent">
              <span className="pointer-events-auto mb-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
                <Lock size={12} /> The full response package and export require a paid plan
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={exportDossier} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Export due diligence response package
          </Button>
          <span className="text-xs text-[var(--color-muted)]">
            Free to view · Paid to export/share (monetize the evidence you already have, rather than buying uncertain protection)
          </span>
        </div>

        {upgrade && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-surface-2)] p-3 text-sm">
            <span>{upgrade}</span>
            <Button asChild size="sm">
              <Link href="/pricing">Upgrade plan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
