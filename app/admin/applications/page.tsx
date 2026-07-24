import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationActions } from "@/components/admin/application-actions";
import { formatDate } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

function statusClass(status: ApplicationStatus) {
  switch (status) {
    case "PENDING":
      return "text-[var(--color-medium)]";
    case "APPROVED":
      return "text-[var(--color-accent)]";
    case "REJECTED":
      return "text-[var(--color-critical)]";
  }
}

export default async function AdminApplicationsPage() {
  const apps = await prisma.accessApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const pending = apps.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Access Requests</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Once approved, the applicant is notified by email and can sign in to the console (Pending {pending})
        </p>
      </div>

      <div className="space-y-3">
        {apps.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              No requests yet. Applicants can submit one at /apply.
            </CardContent>
          </Card>
        ) : (
          apps.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.name}</span>
                    <Badge className={statusClass(a.status)}>{a.status}</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">{a.email}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {a.company ? `${a.company} · ` : ""}
                    Submitted {formatDate(a.createdAt)}
                    {a.reviewedAt ? ` · Reviewed ${formatDate(a.reviewedAt)}` : ""}
                  </p>
                  {a.note ? (
                    <p className="text-sm text-[var(--color-foreground)]">{a.note}</p>
                  ) : null}
                </div>
                {a.status === "PENDING" ? <ApplicationActions id={a.id} /> : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
