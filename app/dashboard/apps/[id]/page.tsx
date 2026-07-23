import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { planFor } from "@/lib/plans";
import { requireActiveUser } from "@/lib/access/session";
import { buildDossier } from "@/lib/compliance/dossier";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonitoringToggle } from "@/components/monitoring-toggle";
import { AlertItem, type AlertView } from "@/components/alert-item";
import { EvidenceVerify } from "@/components/evidence-verify";
import { PanicPanel } from "@/components/panic-panel";
import { formatDate } from "@/lib/utils";
import type { Severity } from "@/lib/types";
import { DatabaseZap, FileClock, ArrowLeft, ExternalLink } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AppDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActiveUser();
  const { id } = await params;

  const app = await prisma.app.findFirst({
    where: { id, userId: session.user.id },
    include: {
      scans: { where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 20 },
      alerts: { orderBy: { openedAt: "desc" }, take: 30 },
      evidenceRecords: { orderBy: { seq: "desc" }, take: 20 },
    },
  });
  if (!app) notFound();

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  const plan = planFor(sub?.tier ?? "FREE");
  const dossier = await buildDossier(id);

  const openAlerts = app.alerts.filter((a) => a.state !== "RESOLVED");
  const latest = app.scans[0];

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft size={15} /> 返回控制台
      </Link>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 break-all text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            {app.url} <ExternalLink size={13} />
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <MonitoringToggle appId={app.id} initial={app.monitoringEnabled} />
          <Button asChild variant="secondary" size="sm">
            <Link href={`/audit?url=${encodeURIComponent(app.url)}&from=${app.id}`}>
              <DatabaseZap size={15} /> 深度审计
            </Link>
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[var(--color-primary)]">
              {latest?.score ?? "—"}
            </div>
            <div className="text-xs text-[var(--color-muted)]">最新评分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div
              className={`text-3xl font-bold ${
                openAlerts.length > 0 ? "text-[var(--color-critical)]" : "text-[var(--color-accent)]"
              }`}
            >
              {openAlerts.length}
            </div>
            <div className="text-xs text-[var(--color-muted)]">待处理告警</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{dossier?.evidenceCount ?? 0}</div>
            <div className="text-xs text-[var(--color-muted)]">证据记录</div>
          </CardContent>
        </Card>
      </div>

      {/* alerts */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          告警 <span className="text-[var(--color-muted)]">({openAlerts.length} 待处理)</span>
        </h2>
        {app.alerts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-[var(--color-muted)]">
              暂无告警。开启每日监测后，出现安全回退会第一时间通知你。
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {app.alerts.map((a) => (
              <AlertItem
                key={a.id}
                alert={
                  {
                    id: a.id,
                    severity: a.severity as Severity,
                    title: a.title,
                    detail: a.detail,
                    state: a.state,
                    openedAt: a.openedAt,
                  } as AlertView
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* scan history timeline */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">体检历史时间轴</h2>
        {app.scans.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-[var(--color-muted)]">
              还没有完成的体检。
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {app.scans.map((s) => (
              <Link key={s.id} href={`/report/${s.id}`}>
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-primary)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-primary)]">
                      <FileClock size={16} />
                    </span>
                    <div>
                      <div className="text-sm font-medium">
                        {kindLabel(s.kind)} · 评分 {s.score ?? "—"}
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">
                        {formatDate(s.createdAt)}
                        {s.rulesetVersion ? ` · ${s.rulesetVersion}` : ""}
                      </div>
                    </div>
                  </div>
                  <Badge>查看报告</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* compliance archive */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">合规档案 · 证据链</h2>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="text-[var(--color-muted)]">
                监测连续性：约 {dossier?.monitoringDays ?? 0} 天 · 共 {dossier?.evidenceCount ?? 0} 条不可篡改记录
              </div>
              <EvidenceVerify appId={app.id} />
            </div>
            {app.evidenceRecords.length > 0 && (
              <ul className="space-y-1 text-xs text-[var(--color-muted)]">
                {app.evidenceRecords.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-center gap-2">
                    <span className="font-mono text-[var(--color-foreground)]">#{e.seq}</span>
                    <span>{evidenceLabel(e.type)}</span>
                    <span>·</span>
                    <span>{formatDate(e.createdAt)}</span>
                    <span className="truncate font-mono opacity-60">
                      {e.chainHash.slice(0, 12)}…
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* panic panel */}
      {dossier && (
        <section className="mt-8">
          <PanicPanel
            appId={app.id}
            canExport={plan.canExport}
            scanCount={dossier.scanCount}
            monitoringDays={dossier.monitoringDays}
            evidenceCount={dossier.evidenceCount}
            preview={dossier.answers.map((a) => ({
              question: a.question,
              answer: a.answer,
              status: a.status,
            }))}
          />
        </section>
      )}
    </div>
  );
}

function kindLabel(k: string) {
  return k === "EXTERNAL" ? "外部体检" : k === "DEEP" ? "深度审计" : "监测扫描";
}
function evidenceLabel(t: string) {
  return t === "BASELINE"
    ? "安全基线快照"
    : t === "HEARTBEAT"
      ? "监测心跳"
      : t === "REMEDIATION"
        ? "修复记录"
        : "事故记录";
}
