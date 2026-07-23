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
        <h2 className="text-xl font-semibold">资讯订阅</h2>
        <p className="text-sm text-[var(--color-muted)]">
          仅登记邮箱收资讯的访客（非控制台账号）· 有效 {active} / 共 {subs.length}
        </p>
      </div>

      <div className="space-y-3">
        {subs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              还没有订阅。访客可在首页底部「登记邮箱」提交。
            </CardContent>
          </Card>
        ) : (
          subs.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{s.email}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    来源 {s.source ?? "—"} · {formatDate(s.createdAt)}
                  </div>
                </div>
                <Badge
                  className={
                    s.unsubscribed
                      ? "text-[var(--color-critical)]"
                      : "text-[var(--color-accent)]"
                  }
                >
                  {s.unsubscribed ? "已退订" : "订阅中"}
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
