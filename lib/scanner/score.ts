import type { Finding, RiskCounts, Severity } from "@/lib/types";

const WEIGHT: Record<Severity, number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 8,
  LOW: 3,
  INFO: 0,
};

export function riskCounts(findings: Finding[]): RiskCounts {
  const c: RiskCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    switch (f.severity) {
      case "CRITICAL":
        c.critical++;
        break;
      case "HIGH":
        c.high++;
        break;
      case "MEDIUM":
        c.medium++;
        break;
      case "LOW":
        c.low++;
        break;
      default:
        c.info++;
    }
  }
  return c;
}

/** 0-100 safety score; higher is safer. */
export function safetyScore(findings: Finding[]): number {
  let penalty = 0;
  for (const f of findings) penalty += WEIGHT[f.severity];
  return Math.max(0, Math.min(100, 100 - penalty));
}

/** The three headline numbers shown at the top of the report. */
export function headlineNumbers(findings: Finding[]) {
  const actionable = findings.filter((f) => f.severity !== "INFO");
  const totalRisks = actionable.length;
  const top = [...actionable].sort(
    (a, b) => WEIGHT[b.severity] - WEIGHT[a.severity]
  )[0];
  const estMinutes = actionable.reduce(
    (sum, f) => sum + (f.remediation.estMinutes ?? 15),
    0
  );
  return {
    totalRisks,
    topSeverity: top?.severity ?? null,
    topTitle: top?.title ?? null,
    estMinutes,
  };
}
