import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "@/components/admin/user-actions";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      _count: { select: { apps: true, emailDeliveries: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Manage roles and subscription tiers ({users.length} total)
        </p>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.email ?? "No email"}</span>
                  <Badge
                    className={
                      u.role === "ADMIN"
                        ? "border-[color-mix(in_srgb,var(--color-critical)_45%,transparent)] text-[var(--color-critical)]"
                        : undefined
                    }
                  >
                    {u.role}
                  </Badge>
                  <Badge>{u.subscription?.tier ?? "FREE"}</Badge>
                  <Badge
                    className={
                      u.status === "ACTIVE"
                        ? "text-[var(--color-accent)]"
                        : u.status === "PENDING"
                          ? "text-[var(--color-medium)]"
                          : "text-[var(--color-critical)]"
                    }
                  >
                    {u.status}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  {u.name ?? "Unnamed"} · {u._count.apps} apps ·{" "}
                  {u._count.emailDeliveries} emails · joined{" "}
                  {formatDate(u.createdAt)}
                </p>
              </div>
              <UserActions
                userId={u.id}
                role={u.role}
                tier={u.subscription?.tier ?? "FREE"}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
