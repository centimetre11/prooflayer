import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { summarizeCapabilities } from "@/lib/capabilities/catalog";
import {
  Users,
  Newspaper,
  AppWindow,
  Bell,
  Mail,
  ScanLine,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const { totals: capabilityTotals } = summarizeCapabilities();

  const [
    userCount,
    users7d,
    subscriberCount,
    subscribers7d,
    appCount,
    openAlerts,
    scans7d,
    emails7d,
    failedEmails,
    recentUsers,
    recentScans,
    recentEmails,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "ACTIVE", createdAt: { gte: since7d } } }),
    prisma.emailSubscriber.count({ where: { unsubscribed: false } }),
    prisma.emailSubscriber.count({ where: { unsubscribed: false, createdAt: { gte: since7d } } }),
    prisma.app.count(),
    prisma.alert.count({ where: { state: { in: ["OPEN", "ACK"] } } }),
    prisma.scan.count({ where: { createdAt: { gte: since7d } } }),
    prisma.emailDelivery.count({ where: { createdAt: { gte: since7d } } }),
    prisma.emailDelivery.count({
      where: { status: "FAILED", createdAt: { gte: since30d } },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { subscription: true, _count: { select: { apps: true } } },
    }),
    prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { app: { select: { name: true } } },
    }),
    prisma.emailDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const sections: {
    title: string;
    stats: {
      label: string;
      value: number;
      delta?: string;
      href: string;
      icon: typeof Users;
      tone?: "warn";
    }[];
  }[] = [
    {
      title: "用户与增长",
      stats: [
        { label: "活跃用户", value: userCount, delta: `+${users7d} / 7天`, href: "/admin/users", icon: Users },
        { label: "资讯订阅", value: subscriberCount, delta: `+${subscribers7d} / 7天`, href: "/admin/subscribers", icon: Newspaper },
      ],
    },
    {
      title: "业务健康",
      stats: [
        { label: "受监测应用", value: appCount, href: "/admin/apps", icon: AppWindow },
        { label: "未关闭告警", value: openAlerts, href: "/admin/apps", icon: Bell, tone: openAlerts > 0 ? "warn" : undefined },
        { label: "7 日扫描", value: scans7d, href: "/admin/apps", icon: ScanLine },
        { label: "检测能力已落地", value: capabilityTotals.done, href: "/admin/capabilities", icon: ShieldCheck },
      ],
    },
    {
      title: "系统与邮件",
      stats: [
        { label: "7 日邮件投递", value: emails7d, href: "/admin/emails", icon: Mail },
        { label: "30 日失败邮件", value: failedEmails, href: "/admin/emails", icon: Mail, tone: failedEmails > 0 ? "warn" : undefined },
      ],
    },
  ];

  const quickActions = [
    { label: "管理用户与权限", href: "/admin/users", icon: Users },
    { label: "查看资讯订阅名单", href: "/admin/subscribers", icon: Newspaper },
    { label: "邮件投递日志 / 发周报", href: "/admin/emails", icon: Mail },
    { label: "检测能力清单", href: "/admin/capabilities", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">运营概览</h1>
        <p className="text-sm text-[var(--color-muted)]">
          管理用户、订阅、内容与系统健康 —— 这里不做产品功能，只做管理。
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-muted)]">
            {section.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {section.stats.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.label} href={s.href}>
                  <Card className="h-full transition-colors hover:border-[var(--color-primary)]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between text-[var(--color-muted)]">
                        <span className="text-sm">{s.label}</span>
                        <Icon
                          size={16}
                          className={s.tone === "warn" ? "text-[var(--color-critical)]" : undefined}
                        />
                      </div>
                      <div
                        className={
                          "mt-2 text-3xl font-semibold tabular-nums " +
                          (s.tone === "warn" ? "text-[var(--color-critical)]" : "")
                        }
                      >
                        {s.value}
                      </div>
                      {s.delta ? (
                        <div className="mt-1 text-xs text-[var(--color-accent)]">
                          {s.delta}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-muted)]">快捷管理</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm transition-colors hover:border-[var(--color-primary)]"
              >
                <span className="flex items-center gap-2">
                  <Icon size={16} className="text-[var(--color-primary)]" />
                  {a.label}
                </span>
                <ArrowRight size={14} className="text-[var(--color-muted)]" />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最新注册用户</CardTitle>
            <Link href="/admin/users" className="text-xs text-[var(--color-primary)] hover:underline">
              全部
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">暂无用户</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{u.email}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {u.subscription?.tier ?? "FREE"} · {u._count.apps} 应用
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-[var(--color-muted)]">
                    {formatDate(u.createdAt)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近扫描</CardTitle>
            <Link href="/admin/apps" className="text-xs text-[var(--color-primary)] hover:underline">
              全部
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentScans.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">暂无扫描</p>
            ) : (
              recentScans.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.app?.name ?? s.url}</div>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近邮件</CardTitle>
            <Link href="/admin/emails" className="text-xs text-[var(--color-primary)] hover:underline">
              全部
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEmails.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">暂无投递记录</p>
            ) : (
              recentEmails.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.subject}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {e.kind} · {e.to}
                    </div>
                  </div>
                  <Badge
                    className={
                      e.status === "SENT"
                        ? "text-[var(--color-accent)]"
                        : e.status === "FAILED"
                          ? "text-[var(--color-critical)]"
                          : undefined
                    }
                  >
                    {e.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
