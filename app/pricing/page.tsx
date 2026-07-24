import Link from "next/link";
import { PLANS, PROMO_LABEL } from "@/lib/plans";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pricing by number of protected apps</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          Free security checks drive acquisition; governance subscriptions are the core of revenue. The reason to pay is to monetize the evidence you already have—viewing is free, exporting/sharing is paid.
        </p>
        <p className="mt-2 text-sm text-[var(--color-primary)]">
          {PROMO_LABEL}: paid tiers show the original price, with a limited-time deal price of $0
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const onPromo = Boolean(p.promoPrice);
          return (
            <Card
              key={p.tier}
              className={p.highlight ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40" : ""}
            >
              <CardContent className="flex h-full flex-col p-6">
                {p.highlight && (
                  <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary-fg)]">
                    <Zap size={12} /> Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-2">
                  {onPromo ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-[var(--color-muted)] line-through">{p.price}</span>
                        <span className="rounded bg-[var(--color-primary)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                          {PROMO_LABEL}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-end gap-1">
                        <span className="text-3xl font-bold">{p.promoPrice}</span>
                        <span className="mb-1 text-sm text-[var(--color-muted)]">/ {p.priceNote}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold">{p.price}</span>
                      <span className="mb-1 text-sm text-[var(--color-muted)]">/ {p.priceNote}</span>
                    </div>
                  )}
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
                  <Link href={p.tier === "ENTERPRISE" ? "/#subscribe" : "/register"}>
                    {p.tier === "FREE"
                      ? "Sign up free"
                      : p.tier === "ENTERPRISE"
                        ? "Contact us by email"
                        : onPromo
                          ? "Sign up free (limited time)"
                          : "Sign up"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-muted)]">
        This page is for plan display only; no payment gateway is connected yet. InsightElk provides detection tools only and is not a security guarantor.
      </p>
    </div>
  );
}
