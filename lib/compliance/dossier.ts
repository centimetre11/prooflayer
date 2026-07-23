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
      question: "是否对含用户数据的数据库表启用了行级安全（RLS）？",
      answer:
        criticalOpen === 0
          ? "是。最近一次审计未发现 RLS 缺失或恒真策略的高危问题。"
          : `存在 ${criticalOpen} 项待处理的高优 RLS/密钥问题，正在按修复闭环处理。`,
      evidence: `最近审计于 ${latest ? new Date(latest.createdAt).toISOString() : "无"}，共 ${baselines.length} 次基线快照存档。`,
      status: criticalOpen === 0 ? "satisfied" : "partial",
    },
    {
      question: "是否对生产环境进行持续的安全监测？",
      answer: app.monitoringEnabled
        ? `是。已持续监测约 ${monitoringDays} 天，共 ${heartbeats.length} 条监测心跳记录。`
        : "监测尚未开启。",
      evidence: `监测连续性由不可篡改的心跳证据链证明（校验：${chain.ok ? "通过" : "异常"}）。`,
      status: app.monitoringEnabled ? "satisfied" : "gap",
    },
    {
      question: "发现安全问题后是否有闭环的响应与修复流程？",
      answer:
        remediations.length > 0
          ? `是。共记录 ${remediations.length} 次修复状态跃迁（发现→确认→修复→复测）。`
          : "暂无修复记录（可能尚未发现需修复的问题）。",
      evidence: `所有修复动作带时间戳写入证据链，可逐条复核。`,
      status: remediations.length > 0 ? "satisfied" : "partial",
    },
    {
      question: "安全证据是否防篡改、可供第三方核验？",
      answer: chain.ok
        ? `是。共 ${chain.length} 条证据记录构成哈希链，任意篡改都会被校验发现。`
        : "证据链校验发现异常，需排查。",
      evidence: `chain_hash = sha256(prev_hash ‖ payload_hash ‖ created_at)。`,
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
      return `安全基线快照，评分 ${p.score ?? "-"}`;
    case "HEARTBEAT":
      return "监测心跳";
    case "REMEDIATION":
      return `修复：${p.fingerprint ?? ""} ${p.from ?? ""}→${p.to ?? ""}`;
    case "INCIDENT":
      return "事故记录";
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
            a.status === "satisfied" ? "已满足" : a.status === "partial" ? "部分满足" : "待补齐"
          }</span>
        </div>
        <div class="a">${a.answer}</div>
        <div class="e">证据：${a.evidence}</div>
      </div>`
    )
    .join("");
  const tl = d.timeline
    .map((t) => `<li><code>${t.at}</code> · ${t.type} · ${t.summary}</li>`)
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
  <title>麋鹿洞察 · 尽调应答包 · ${d.app.name}</title>
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
  <h1>安全尽职调查应答包</h1>
  <div class="sub">${d.app.name} · ${d.app.url} · 生成于 ${d.generatedAt}</div>
  <div class="grid">
    <div class="stat"><b>${d.scanCount}</b>次安全扫描</div>
    <div class="stat"><b>${d.monitoringDays}</b>天监测连续性</div>
    <div class="stat"><b>${d.evidenceCount}</b>条证据记录</div>
    <div class="stat"><b>${d.chainOk ? "通过" : "异常"}</b>证据链校验</div>
  </div>
  <h2>合规问答（SIG-Lite 精简版）</h2>
  ${rows}
  <h2>证据时间轴（近 40 条）</h2>
  <ul>${tl}</ul>
  <div class="foot">本应答包由麋鹿洞察依据不可篡改证据链自动生成。麋鹿洞察仅提供检测与存证工具，非安全担保方；本材料用于尽职调查参考，不构成安全保证。</div>
  </body></html>`;
}
