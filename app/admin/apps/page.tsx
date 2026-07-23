import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function AdminAppsPage() {
  const apps = await prisma.app.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true } },
      scans: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          alerts: { where: { state: { in: ["OPEN", "ACK"] } } },
          scans: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">应用</h2>
        <p className="text-sm text-[var(--color-muted)]">
          全站应用与监测状态（最近 {apps.length} 条）
        </p>
      </div>

      <div className="space-y-3">
        {apps.map((app) => {
          const last = app.scans[0];
          return (
            <Card key={app.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{app.name}</span>
                    {app.monitoringEnabled ? (
                      <Badge className="text-[var(--color-accent)]">监测中</Badge>
                    ) : (
                      <Badge>监测关闭</Badge>
                    )}
                    {app._count.alerts > 0 ? (
                      <Badge className="text-[var(--color-critical)]">
                        {app._count.alerts} 告警
                      </Badge>
                    ) : null}
                  </div>
                  <p className="break-all text-xs text-[var(--color-muted)]">
                    {app.url}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    归属 {app.user?.email ?? "匿名"} · 扫描 {app._count.scans} 次 ·
                    最近评分 {last?.score ?? "—"} · 创建于{" "}
                    {formatDate(app.createdAt)}
                  </p>
                </div>
                {app.user ? (
                  <Link
                    href={`/dashboard/apps/${app.id}`}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    查看控制台页
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
