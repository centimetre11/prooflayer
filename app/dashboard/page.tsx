import Link from "next/link";
import { prisma } from "@/lib/db";
import { planFor } from "@/lib/plans";
import { requireActiveUser } from "@/lib/access/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanForm } from "@/components/scan-form";
import { NotificationSettings } from "@/components/notification-settings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { formatDate } from "@/lib/utils";
import { AppWindow, Bell, ShieldCheck, ArrowRight } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await requireActiveUser();

  const [apps, sub] = await Promise.all([
    prisma.app.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        scans: { orderBy: { createdAt: "desc" }, take: 1 },
        alerts: { where: { state: "OPEN" } },
        _count: { select: { evidenceRecords: true } },
      },
    }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
  ]);

  const plan = planFor(sub?.tier ?? "FREE");

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">控制台</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {session.user.email} · {plan.name} 方案 · {apps.length}/{plan.appLimit} 应用
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/pricing">升级方案</Link>
          </Button>
          <SignOutButton className="inline-flex h-8 items-center rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-foreground)] hover:border-[var(--color-primary)] disabled:opacity-50" />
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-medium">体检一个新应用</h2>
          <ScanForm size="md" />
        </CardContent>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold">我的应用</h2>
      {apps.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-muted)]">
            还没有应用。上面粘贴一个地址开始体检吧。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const last = app.scans[0];
            return (
              <Link key={app.id} href={`/dashboard/apps/${app.id}`}>
                <Card className="transition-colors hover:border-[var(--color-primary)]">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-primary)]">
                        <AppWindow size={18} />
                      </span>
                      <div>
                        <div className="font-medium">{app.name}</div>
                        <div className="break-all text-xs text-[var(--color-muted)]">{app.url}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <Stat label="评分" value={last?.score != null ? String(last.score) : "—"} />
                      <Stat
                        label="开放告警"
                        value={String(app.alerts.length)}
                        tone={app.alerts.length > 0 ? "bad" : "good"}
                      />
                      <Stat label="证据" value={String(app._count.evidenceRecords)} />
                      <div className="hidden text-xs text-[var(--color-muted)] sm:block">
                        {app.monitoringEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                            <Bell size={13} /> 监测中
                          </span>
                        ) : (
                          "未开启监测"
                        )}
                        <div className="mt-1">
                          {last ? formatDate(last.createdAt) : "未体检"}
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[var(--color-muted)]" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card className="mt-8">
        <CardContent className="p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Bell size={14} /> 邮件通知偏好
          </h2>
          <p className="mb-4 text-xs text-[var(--color-muted)]">
            控制告警、周报与体检完成邮件。魔法链接登录邮件始终发送。
          </p>
          <NotificationSettings />
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <ShieldCheck size={14} /> 仅提供检测工具，非安全担保方 · 默认只告警不阻断
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "bad"
      ? "text-[var(--color-critical)]"
      : tone === "good"
        ? "text-[var(--color-accent)]"
        : "text-[var(--color-foreground)]";
  return (
    <div className="text-center">
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
