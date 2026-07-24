import { SeverityBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Wrench, MapPin, Clock } from "lucide-react";
import type { Severity } from "@/lib/types";

export interface FindingView {
  ruleId: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  confidence: number;
  evidence?: Record<string, unknown> | null;
  remediation?: {
    summary?: string;
    steps?: string[];
    consolePath?: string;
    estMinutes?: number;
  } | null;
}

export function FindingCard({ finding }: { finding: FindingView }) {
  const ev = finding.evidence ?? {};
  const rem = finding.remediation ?? {};
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-5">
        <div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <span className="text-xs text-[var(--color-muted)]">
              {finding.category} · Confidence {finding.confidence}%
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold">{finding.title}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{finding.description}</p>
        </div>
      </div>

      {Object.keys(ev).length > 0 && (
        <div className="mx-5 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="mb-1 text-xs font-medium text-[var(--color-muted)]">Evidence (redacted)</div>
          <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {Object.entries(ev).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-[var(--color-muted)]">{k}:</dt>
                <dd className="break-all font-mono text-[var(--color-foreground)]">
                  {String(v)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {(rem.summary || (rem.steps && rem.steps.length > 0)) && (
        <div className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-2)_60%,transparent)] p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wrench size={16} className="text-[var(--color-accent)]" />
            How to fix
          </div>
          {rem.summary && <p className="mt-2 text-sm">{rem.summary}</p>}
          {rem.steps && rem.steps.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--color-muted)]">
              {rem.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--color-muted)]">
            {rem.consolePath && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {rem.consolePath}
              </span>
            )}
            {typeof rem.estMinutes === "number" && rem.estMinutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> ~{rem.estMinutes} min
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
