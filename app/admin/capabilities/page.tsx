import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABEL,
  summarizeCapabilities,
  type CapabilityStatus,
} from "@/lib/capabilities/catalog";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDashed, CircleDot } from "lucide-react";

export default function AdminCapabilitiesPage() {
  const { totals, byLayer } = summarizeCapabilities();
  const donePct =
    totals.all > 0 ? Math.round(((totals.done + totals.partial * 0.5) / totals.all) * 100) : 0;
  const doneWidth = totals.all ? (totals.done / totals.all) * 100 : 0;
  const partialWidth = totals.all ? (totals.partial / totals.all) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Detection Capabilities</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Tracks shipped and planned capabilities by security detection layer, so product and operations stay aligned on progress.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Total checks" value={totals.all} />
        <SummaryStat label="Shipped" value={totals.done} tone="done" />
        <SummaryStat label="Partially shipped" value={totals.partial} tone="partial" />
        <SummaryStat label="Not started / planned" value={totals.planned} tone="planned" />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted)]">Overall completion (partial counted as 50%)</span>
            <span className="font-semibold tabular-nums">{donePct}%</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full bg-[var(--color-accent)]"
              style={{ width: `${doneWidth}%` }}
            />
            <div
              className="h-full bg-[var(--color-medium)]"
              style={{ width: `${partialWidth}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(STATUS_LABEL) as CapabilityStatus[]).map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {byLayer.map(({ layer, counts }, index) => (
          <Card key={layer.id} id={layer.id}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
                    Layer {index + 1}
                  </p>
                  <CardTitle className="mt-0.5">{layer.name}</CardTitle>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{layer.summary}</p>
                </div>
                <Badge className="shrink-0">{layer.access}</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                <span>
                  Shipped <strong className="text-[var(--color-accent)]">{counts.done}</strong>
                </span>
                <span>
                  Partial <strong className="text-[var(--color-medium)]">{counts.partial}</strong>
                </span>
                <span>
                  Not started <strong className="text-[var(--color-foreground)]">{counts.planned}</strong>
                </span>
                <span>{counts.all} total</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {layer.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border border-[var(--color-border)] px-4 py-3",
                    item.status === "planned" && "opacity-80"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <StatusIcon status={item.status} />
                      <div className="min-w-0">
                        <div className="font-medium leading-snug">{item.title}</div>
                        <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                          {item.description}
                        </p>
                        {item.note ? (
                          <p className="mt-1 text-xs text-[var(--color-medium)]">{item.note}</p>
                        ) : null}
                        {item.ruleIds?.length ? (
                          <p className="mt-1.5 font-mono text-[11px] text-[var(--color-muted)]">
                            {item.ruleIds.join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusChip status={item.status} />
                      <span className="text-[11px] text-[var(--color-muted)]">{item.module}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        The list is defined in{" "}
        <code className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5">
          lib/capabilities/catalog.ts
        </code>
        . Keep it in sync when adding new rules or audit items.
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: CapabilityStatus;
}) {
  const color =
    tone === "done"
      ? "text-[var(--color-accent)]"
      : tone === "partial"
        ? "text-[var(--color-medium)]"
        : tone === "planned"
          ? "text-[var(--color-muted)]"
          : "text-[var(--color-foreground)]";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-[var(--color-muted)]">{label}</div>
        <div className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }: { status: CapabilityStatus }) {
  const styles: Record<CapabilityStatus, string> = {
    done: "border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]",
    partial:
      "border-[color-mix(in_srgb,var(--color-medium)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-medium)_14%,transparent)] text-[var(--color-medium)]",
    planned: "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {STATUS_LABEL[status].short}
    </span>
  );
}

function StatusIcon({ status }: { status: CapabilityStatus }) {
  if (status === "done") {
    return <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />;
  }
  if (status === "partial") {
    return <CircleDot size={16} className="mt-0.5 shrink-0 text-[var(--color-medium)]" />;
  }
  return <CircleDashed size={16} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />;
}
