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
        setUpgrade(data.message ?? "升级方案即可导出");
        return;
      }
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prooflayer-dossier-${appId}.html`;
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
          <h3 className="font-semibold">恐慌时刻 · 尽调应答包</h3>
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          你过去 <b className="text-[var(--color-foreground)]">{monitoringDays}</b> 天有{" "}
          <b className="text-[var(--color-foreground)]">{scanCount}</b> 次扫描、
          <b className="text-[var(--color-foreground)]">{evidenceCount}</b>{" "}
          条证据记录可用于应答。出事故或客户尽调时，一键生成自证清白的材料。
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
                <Lock size={12} /> 完整应答包与导出需付费方案
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={exportDossier} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            导出尽调应答包
          </Button>
          <span className="text-xs text-[var(--color-muted)]">
            查看免费 · 导出/分享付费（把既有证据变现，而非购买不确定的保护）
          </span>
        </div>

        {upgrade && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-surface-2)] p-3 text-sm">
            <span>{upgrade}</span>
            <Button asChild size="sm">
              <Link href="/pricing">升级方案</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
