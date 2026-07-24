import { FindingCard, type FindingView } from "@/components/finding-card";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { SEVERITY_ORDER, type Severity } from "@/lib/types";
import { ShieldCheck, AlertTriangle, Clock } from "lucide-react";

const SEV_WEIGHT: Record<Severity, number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 8,
  LOW: 3,
  INFO: 0,
};

export interface ReportData {
  url: string;
  createdAt: Date | string;
  rulesetVersion?: string | null;
  score?: number | null;
  supabaseUrl?: string | null;
  findings: FindingView[];
}

export function ReportView({
  data,
  actions,
}: {
  data: ReportData;
  actions?: React.ReactNode;
}) {
  const actionable = data.findings.filter((f) => f.severity !== "INFO");
  const totalRisks = actionable.length;
  const top = [...actionable].sort(
    (a, b) => SEV_WEIGHT[b.severity] - SEV_WEIGHT[a.severity]
  )[0];
  const estMinutes = actionable.reduce(
    (s, f) => s + (f.remediation?.estMinutes ?? 15),
    0
  );
  const score = data.score ?? 100;

  const sorted = [...data.findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security check report</h1>
          <p className="mt-1 break-all text-sm text-[var(--color-muted)]">
            {data.url} · {formatDate(data.createdAt)}
            {data.rulesetVersion ? ` · Ruleset ${data.rulesetVersion}` : ""}
          </p>
        </div>
        {actions}
      </div>

      {/* three headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <HeadlineCard
          icon={<AlertTriangle size={18} />}
          value={String(totalRisks)}
          label="Total risks found"
          tone={totalRisks === 0 ? "good" : "bad"}
        />
        <HeadlineCard
          icon={<ShieldCheck size={18} />}
          value={top ? "" : "None"}
          label="Highest-severity finding"
          tone={top ? "bad" : "good"}
          custom={
            top ? (
              <div className="flex flex-col items-center gap-1">
                <SeverityBadge severity={top.severity} />
                <span className="line-clamp-1 text-sm">{top.title}</span>
              </div>
            ) : undefined
          }
        />
        <HeadlineCard
          icon={<Clock size={18} />}
          value={estMinutes === 0 ? "0" : `~${estMinutes}`}
          label="Estimated minutes to fix"
          tone={estMinutes === 0 ? "good" : "neutral"}
        />
      </div>

      {/* score + supabase meta */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ScoreRing score={score} />
            <div>
              <div className="text-sm font-medium">Security score</div>
              <div className="text-sm text-[var(--color-muted)]">
                {score >= 80
                  ? "Looking good overall — just keep monitoring"
                  : score >= 50
                    ? "There are risks that need attention"
                    : "Critical risks present — we recommend fixing them as soon as possible"}
              </div>
            </div>
          </div>
          <div className="text-sm text-[var(--color-muted)]">
            {data.supabaseUrl ? (
              <>Supabase detected: <span className="font-mono text-[var(--color-foreground)]">{data.supabaseUrl}</span></>
            ) : (
              "No Supabase project detected (may be a different tech stack)"
            )}
          </div>
        </CardContent>
      </Card>

      {/* findings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Risk list <span className="text-[var(--color-muted)]">({data.findings.length})</span>
        </h2>
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-[var(--color-muted)]">
              No obvious risks found. Turn on daily monitoring to prevent configuration drift from AI-rewritten code.
            </CardContent>
          </Card>
        ) : (
          sorted.map((f, i) => <FindingCard key={i} finding={f} />)
        )}
      </div>
    </div>
  );
}

function HeadlineCard({
  icon,
  value,
  label,
  tone,
  custom,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: "good" | "bad" | "neutral";
  custom?: React.ReactNode;
}) {
  const color =
    tone === "bad"
      ? "text-[var(--color-critical)]"
      : tone === "good"
        ? "text-[var(--color-accent)]"
        : "text-[var(--color-primary)]";
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-muted)]">
          {icon}
        </div>
        {custom ?? <div className={`text-4xl font-bold ${color}`}>{value}</div>}
        <div className="mt-1 text-sm text-[var(--color-muted)]">{label}</div>
      </CardContent>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80
      ? "var(--color-accent)"
      : score >= 50
        ? "var(--color-medium)"
        : "var(--color-critical)";
  return (
    <div
      className="grid h-16 w-16 place-items-center rounded-full text-lg font-bold"
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, var(--color-surface-2) 0deg)`,
      }}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-surface)]">
        {score}
      </span>
    </div>
  );
}
