import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">按受保护应用数定价</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          免费体检获客，治理订阅为收入主体。付费动机是把既有证据变现——查看免费，导出/分享付费。
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <Card
            key={p.tier}
            className={p.highlight ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40" : ""}
          >
            <CardContent className="flex h-full flex-col p-6">
              {p.highlight && (
                <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary-fg)]">
                  <Zap size={12} /> 最受欢迎
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="mb-1 text-sm text-[var(--color-muted)]">/ {p.priceNote}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                    <span className="text-[var(--color-muted)]">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={p.highlight ? "primary" : "secondary"}
                className="mt-6 w-full"
              >
                <Link href="/login">
                  {p.tier === "FREE" ? "免费开始" : p.tier === "ENTERPRISE" ? "联系我们" : "选择方案"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-muted)]">
        本页为方案展示，尚未接入支付网关。麋鹿洞察仅提供检测工具，非安全担保方。
      </p>
    </div>
  );
}
