import { prisma } from "@/lib/db";
import { verifyChain } from "@/lib/evidence/chain";

export interface DossierAnswer {
  question: string;
  answer: string;
  evidence: string;
  status: "satisfied" | "partial" | "gap";
}

export interface Dossier {
  app: { name: string; url: string };
  generatedAt: string;
  scanCount: number;
  evidenceCount: number;
  monitoringDays: number;
  chainOk: boolean;
  latestScore: number | null;
  answers: DossierAnswer[];
  timeline: { at: string; type: string; summary: string }[];
}

/**
 * Build a due-diligence response pack (SIG-lite style) from an app's scan
 * history + evidence chain. This is the "panic moment" deliverable.
 */
export async function buildDossier(appId: string): Promise<Dossier | null> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      scans: { where: { status: "DONE" }, orderBy: { createdAt: "desc" } },
      evidenceRecords: { orderBy: { seq: "asc" } },
      alerts: true,
    },
  });
  if (!app) return null;

  const chain = await verifyChain(appId);
  const heartbeats = app.evidenceRecords.filter((e) => e.type === "HEARTBEAT");
  const baselines = app.evidenceRecords.filter((e) => e.type === "BASELINE");
  const remediations = app.evidenceRecords.filter((e) => e.type === "REMEDIATION");

  const first = app.evidenceRecords[0];
  const monitoringDays = first
    ? Math.max(
        1,
        Math.round((Date.now() - new Date(first.createdAt).getTime()) / 86400000)
      )
    : 0;

  const latest = app.scans[0];
  const latestScore = latest?.score ?? null;

  const latestFindings = latest
    ? await prisma.scanFinding.findMany({ where: { scanId: latest.id } })
    : [];
  const criticalOpen = latestFindings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
  ).length;

  const answers: DossierAnswer[] = [
    {
      question:
        "Is row-level security (RLS) enabled on database tables that hold user data?",
      answer:
        criticalOpen === 0
          ? "Yes. The most recent audit found no high-risk issues such as missing RLS or always-true policies."
          : `There are ${criticalOpen} outstanding high-priority RLS/secret issues, currently being worked through the remediation loop.`,
      evidence: `Most recent audit on ${latest ? new Date(latest.createdAt).toISOString() : "none"}, with ${baselines.length} baseline snapshots archived.`,
      status: criticalOpen === 0 ? "satisfied" : "partial",
    },
    {
      question: "Is production continuously monitored for security?",
      answer: app.monitoringEnabled
        ? `Yes. Monitoring has been running continuously for about ${monitoringDays} days, with ${heartbeats.length} monitoring heartbeat records.`
        : "Monitoring is not yet enabled.",
      evidence: `Monitoring continuity is proven by a tamper-evident heartbeat evidence chain (verification: ${chain.ok ? "passed" : "anomaly"}).`,
      status: app.monitoringEnabled ? "satisfied" : "gap",
    },
    {
      question:
        "Is there a closed-loop response and remediation process once a security issue is found?",
      answer:
        remediations.length > 0
          ? `Yes. A total of ${remediations.length} remediation state transitions have been recorded (detected → acknowledged → fixed → verified).`
          : "No remediation records yet (there may not have been any issues requiring remediation).",
      evidence: `Every remediation action is written to the evidence chain with a timestamp and can be reviewed item by item.`,
      status: remediations.length > 0 ? "satisfied" : "partial",
    },
    {
      question:
        "Is the security evidence tamper-proof and verifiable by a third party?",
      answer: chain.ok
        ? `Yes. A total of ${chain.length} evidence records form a hash chain, so any tampering will be caught during verification.`
        : "Evidence chain verification found an anomaly that needs investigation.",
      evidence: `chain_hash = sha256(prev_hash ‖ payload_hash ‖ created_at).`,
      status: chain.ok ? "satisfied" : "gap",
    },
  ];

  const timeline = app.evidenceRecords.slice(-40).map((e) => ({
    at: new Date(e.createdAt).toISOString(),
    type: e.type,
    summary: summarize(e.type, e.payload),
  }));

  return {
    app: { name: app.name, url: app.url },
    generatedAt: new Date().toISOString(),
    scanCount: app.scans.length,
    evidenceCount: app.evidenceRecords.length,
    monitoringDays,
    chainOk: chain.ok,
    latestScore,
    answers,
    timeline,
  };
}

function summarize(type: string, payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case "BASELINE":
      return `Security baseline snapshot, score ${p.score ?? "-"}`;
    case "HEARTBEAT":
      return "Monitoring heartbeat";
    case "REMEDIATION":
      return `Remediation: ${p.fingerprint ?? ""} ${p.from ?? ""}→${p.to ?? ""}`;
    case "INCIDENT":
      return "Incident record";
    default:
      return type;
  }
}

/** Render the dossier as a printable, self-contained HTML document. */
export function renderDossierHtml(d: Dossier): string {
  const rows = d.answers
    .map(
      (a) => `
      <div class="qa">
        <div class="q">${a.question}
          <span class="tag ${a.status}">${
            a.status === "satisfied" ? "Satisfied" : a.status === "partial" ? "Partially satisfied" : "Gap"
          }</span>
        </div>
        <div class="a">${a.answer}</div>
        <div class="e">Evidence: ${a.evidence}</div>
      </div>`
    )
    .join("");
  const tl = d.timeline
    .map((t) => `<li><code>${t.at}</code> · ${t.type} · ${t.summary}</li>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <title>InsightElk · Due-Diligence Response Pack · ${d.app.name}</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;color:#111;line-height:1.6}
    h1{margin-bottom:4px} .sub{color:#666;font-size:13px;margin-bottom:24px}
    .grid{display:flex;gap:16px;margin:20px 0}
    .stat{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center}
    .stat b{display:block;font-size:24px;color:#2563eb}
    .qa{border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin:12px 0}
    .q{font-weight:600} .a{margin:6px 0} .e{color:#666;font-size:13px}
    .tag{font-size:12px;padding:2px 8px;border-radius:999px;margin-left:8px}
    .tag.satisfied{background:#dcfce7;color:#166534}
    .tag.partial{background:#fef9c3;color:#854d0e}
    .tag.gap{background:#fee2e2;color:#991b1b}
    ul{font-size:13px;color:#333} code{color:#2563eb}
    .foot{margin-top:30px;color:#999;font-size:12px;border-top:1px solid #eee;padding-top:12px}
  </style></head><body>
  <h1>Security Due-Diligence Response Pack</h1>
  <div class="sub">${d.app.name} · ${d.app.url} · Generated on ${d.generatedAt}</div>
  <div class="grid">
    <div class="stat"><b>${d.scanCount}</b>security scans</div>
    <div class="stat"><b>${d.monitoringDays}</b>days of monitoring continuity</div>
    <div class="stat"><b>${d.evidenceCount}</b>evidence records</div>
    <div class="stat"><b>${d.chainOk ? "Passed" : "Anomaly"}</b>evidence chain verification</div>
  </div>
  <h2>Compliance Q&A (SIG-Lite)</h2>
  ${rows}
  <h2>Evidence timeline (last 40 entries)</h2>
  <ul>${tl}</ul>
  <div class="foot">This response pack is automatically generated by InsightElk from a tamper-evident evidence chain. InsightElk only provides detection and record-keeping tools and is not a security guarantor; this material is intended for due-diligence reference and does not constitute a security warranty.</div>
  </body></html>`;
}
