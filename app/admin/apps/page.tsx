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
        <h2 className="text-xl font-semibold">Applications</h2>
        <p className="text-sm text-[var(--color-muted)]">
          All apps and their monitoring status (latest {apps.length})
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
                      <Badge className="text-[var(--color-accent)]">Monitoring</Badge>
                    ) : (
                      <Badge>Monitoring off</Badge>
                    )}
                    {app._count.alerts > 0 ? (
                      <Badge className="text-[var(--color-critical)]">
                        {app._count.alerts} alerts
                      </Badge>
                    ) : null}
                  </div>
                  <p className="break-all text-xs text-[var(--color-muted)]">
                    {app.url}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Owner {app.user?.email ?? "Anonymous"} · {app._count.scans} scans ·
                    latest score {last?.score ?? "—"} · created{" "}
                    {formatDate(app.createdAt)}
                  </p>
                </div>
                {app.user ? (
                  <Link
                    href={`/dashboard/apps/${app.id}`}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    View console page
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
