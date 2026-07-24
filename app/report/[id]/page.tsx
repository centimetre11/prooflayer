import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ReportView } from "@/components/report-view";
import { ReportActions } from "@/components/report-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FindingView } from "@/components/finding-card";
import type { Severity } from "@/lib/types";
import { CheckCircle2, AlertTriangle, Bell } from "lucide-react";

export const runtime = "nodejs";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { findings: true },
  });
  if (!scan) notFound();
  if (scan.status !== "DONE") redirect(`/scan/${id}`);

  const findings: FindingView[] = scan.findings.map((f) => ({
    ruleId: f.ruleId,
    category: f.category,
    severity: f.severity as Severity,
    title: f.title,
    description: f.description,
    confidence: f.confidence,
    evidence: (f.evidence ?? {}) as Record<string, unknown>,
    remediation: (f.remediation ?? {}) as FindingView["remediation"],
  }));

  // retest comparison against the previous completed scan of the same URL
  const prev = await prisma.scan.findFirst({
    where: {
      url: scan.url,
      status: "DONE",
      id: { not: scan.id },
      createdAt: { lt: scan.createdAt },
    },
    orderBy: { createdAt: "desc" },
    include: { findings: { select: { fingerprint: true, title: true, severity: true } } },
  });

  let comparison: { fixed: number; added: number } | null = null;
  if (prev) {
    const prevFps = new Set(prev.findings.map((f) => f.fingerprint));
    const curFps = new Set(scan.findings.map((f) => f.fingerprint));
    const fixed = [...prevFps].filter((fp) => !curFps.has(fp)).length;
    const added = [...curFps].filter((fp) => !prevFps.has(fp)).length;
    comparison = { fixed, added };
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      {comparison && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm">
            <span className="font-medium">Retest comparison (vs. last scan):</span>
            <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
              <CheckCircle2 size={15} /> {comparison.fixed} fixed
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--color-high)]">
              <AlertTriangle size={15} /> {comparison.added} new
            </span>
          </CardContent>
        </Card>
      )}

      <ReportView
        data={{
          url: scan.url,
          createdAt: scan.createdAt,
          rulesetVersion: scan.rulesetVersion,
          score: scan.score,
          supabaseUrl: (scan.meta as { supabaseUrl?: string } | null)?.supabaseUrl ?? null,
          findings,
        }}
        actions={<ReportActions scanId={scan.id} url={scan.url} />}
      />

      {/* subscribe CTA */}
      <Card className="mt-10 border-[var(--color-primary)]/40">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
              <Bell size={20} />
            </span>
            <div>
              <h3 className="font-semibold">After you fix it, keep it secure for good</h3>
              <p className="text-sm text-[var(--color-muted)]">
                Turn on daily monitoring: get an instant alert whenever AI-rewritten code causes an RLS regression, and build it into a compliance evidence chain.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/login">Turn on daily monitoring</Link>
            </Button>
            <Button asChild>
              <Link href="/pricing">View plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
