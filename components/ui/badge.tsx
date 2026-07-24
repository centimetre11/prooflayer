import * as React from "react";
import { cn } from "@/lib/utils";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

const severityStyles: Record<Severity, string> = {
  CRITICAL: "bg-[color-mix(in_srgb,var(--color-critical)_18%,transparent)] text-[var(--color-critical)] border-[color-mix(in_srgb,var(--color-critical)_45%,transparent)]",
  HIGH: "bg-[color-mix(in_srgb,var(--color-high)_16%,transparent)] text-[var(--color-high)] border-[color-mix(in_srgb,var(--color-high)_45%,transparent)]",
  MEDIUM: "bg-[color-mix(in_srgb,var(--color-medium)_16%,transparent)] text-[var(--color-medium)] border-[color-mix(in_srgb,var(--color-medium)_45%,transparent)]",
  LOW: "bg-[color-mix(in_srgb,var(--color-low)_16%,transparent)] text-[var(--color-low)] border-[color-mix(in_srgb,var(--color-low)_45%,transparent)]",
  INFO: "bg-[var(--color-surface-2)] text-[var(--color-muted)] border-[var(--color-border)]",
};

const severityLabel: Record<Severity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INFO: "Info",
};

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)]",
        className
      )}
      {...props}
    />
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        severityStyles[severity]
      )}
    >
      {severityLabel[severity]}
    </span>
  );
}
