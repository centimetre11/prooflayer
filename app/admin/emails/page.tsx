import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SendTestEmail } from "@/components/admin/send-test-email";
import { DigestTrigger } from "@/components/admin/digest-trigger";
import { formatDate } from "@/lib/utils";
import { requireAdminPage } from "@/lib/admin/auth";
import type { EmailStatus } from "@prisma/client";

function statusClass(status: EmailStatus) {
  switch (status) {
    case "SENT":
      return "text-[var(--color-accent)]";
    case "FAILED":
      return "text-[var(--color-critical)]";
    case "SKIPPED":
      return "text-[var(--color-medium)]";
    default:
      return undefined;
  }
}

export default async function AdminEmailsPage() {
  const session = await requireAdminPage();

  const deliveries = await prisma.emailDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  const counts = await prisma.emailDelivery.groupBy({
    by: ["status"],
    _count: true,
  });
  const byStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count])
  ) as Partial<Record<EmailStatus, number>>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Email System</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Delivery logs, test sends, and weekly digest triggers
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {(["SENT", "FAILED", "SKIPPED", "QUEUED"] as EmailStatus[]).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <div className="text-xs text-[var(--color-muted)]">{s}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {byStatus[s] ?? 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SendTestEmail defaultTo={session.user.email ?? undefined} />
          <DigestTrigger />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--color-muted)]">
          Last 100 deliveries
        </h3>
        {deliveries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              No email delivery records yet. They will appear here once magic-link sign-ins or monitoring alerts are generated.
            </CardContent>
          </Card>
        ) : (
          deliveries.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.subject}</span>
                    <Badge>{d.kind}</Badge>
                    <Badge className={statusClass(d.status)}>{d.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    To {d.to}
                    {d.user?.email && d.user.email !== d.to
                      ? ` · user ${d.user.email}`
                      : ""}
                    {d.providerId ? ` · provider ${d.providerId}` : ""}
                  </p>
                  {d.error ? (
                    <p className="text-xs text-[var(--color-critical)]">{d.error}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-xs text-[var(--color-muted)]">
                  {formatDate(d.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
