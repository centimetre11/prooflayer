import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function AdminSubscribersPage() {
  const subs = await prisma.emailSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const active = subs.filter((s) => !s.unsubscribed).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Newsletter Subscribers</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Visitors who only signed up with an email for the newsletter (not console accounts) · Active {active} / {subs.length} total
        </p>
      </div>

      <div className="space-y-3">
        {subs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              No subscribers yet. Visitors can sign up via the email registration form at the bottom of the homepage.
            </CardContent>
          </Card>
        ) : (
          subs.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{s.email}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    Source {s.source ?? "—"} · {formatDate(s.createdAt)}
                  </div>
                </div>
                <Badge
                  className={
                    s.unsubscribed
                      ? "text-[var(--color-critical)]"
                      : "text-[var(--color-accent)]"
                  }
                >
                  {s.unsubscribed ? "Unsubscribed" : "Subscribed"}
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
