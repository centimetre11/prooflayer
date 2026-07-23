import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    userCount,
    pendingApps,
    appCount,
    openAlerts,
    scans7d,
    emails7d,
    failedEmails,
    recentScans,
    recentEmails,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.accessApplication.count({ where: { status: "PENDING" } }),
    prisma.app.count(),
    prisma.alert.count({ where: { state: { in: ["OPEN", "ACK"] } } }),
    prisma.scan.count({ where: { createdAt: { gte: since7d } } }),
    prisma.emailDelivery.count({ where: { createdAt: { gte: since7d } } }),
    prisma.emailDelivery.count({
      where: { status: "FAILED", createdAt: { gte: since7d } },
    }),
    prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { app: { select: { name: true } } },
    }),
    prisma.emailDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const stats = [
    { label: "活跃用户", value: userCount, href: "/admin/users" },
    { label: "待审申请", value: pendingApps, href: "/admin/applications" },
    { label: "应用", value: appCount, href: "/admin/apps" },
    { label: "未关闭告警", value: openAlerts, href: "/admin/apps" },
    { label: "7 日扫描", value: scans7d, href: "/admin/apps" },
    { label: "7 日邮件", value: emails7d, href: "/admin/emails" },
    { label: "7 日失败邮件", value: failedEmails, href: "/admin/emails" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">概览</h2>
        <p className="text-sm text-[var(--color-muted)]">
          全站用户、扫描与邮件投递健康度
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-[var(--color-primary)]">
              <CardContent className="p-5">
                <div className="text-sm text-[var(--color-muted)]">{s.label}</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {s.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近扫描</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentScans.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">暂无扫描</p>
            ) : (
              recentScans.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {s.app?.name ?? s.url}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {s.kind} · {s.status}
                      {s.score != null ? ` · 评分 ${s.score}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-[var(--color-muted)]">
                    {formatDate(s.createdAt)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近邮件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEmails.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">暂无投递记录</p>
            ) : (
              recentEmails.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.subject}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {e.kind} · {e.status} · {e.to}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-[var(--color-muted)]">
                    {formatDate(e.createdAt)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
