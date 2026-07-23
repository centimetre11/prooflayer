import type { Finding } from "@/lib/types";
import { fingerprint } from "@/lib/rules/engine";
import { riskCounts, safetyScore } from "@/lib/scanner/score";
import type { AuditResult } from "@/lib/auditor/rls";

function mk(
  ruleId: string,
  severity: Finding["severity"],
  title: string,
  description: string,
  evidence: Record<string, unknown>,
  remediation: Finding["remediation"],
  fpKey: string
): Finding {
  return {
    ruleId,
    category: "firestore-rules",
    severity,
    title,
    description,
    confidence: 90,
    remediation,
    evidence,
    fingerprint: fingerprint(ruleId, fpKey),
  };
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/**
 * Static audit of Firebase Firestore security rules. External scans can never
 * see these — they live in the Firebase project — so this is a "layer 2"
 * (semi-touch) audit just like the Postgres/RLS one, but the user only needs to
 * hand us the rules text (no live connection).
 */
export function runFirestoreAudit(rules: string): AuditResult {
  const findings: Finding[] = [];
  const text = rules ?? "";

  if (!/rules_version\s*=\s*['"]2['"]/.test(text)) {
    findings.push(
      mk(
        "fs-rules-version",
        "INFO",
        "未声明 rules_version = '2'",
        "未显式声明规则版本，建议使用 v2 语法以获得递归通配符等能力。",
        {},
        {
          summary: "在规则文件首行声明 rules_version = '2';",
          steps: ["在 firestore.rules 顶部加上 rules_version = '2';"],
          consolePath: "Firestore → Rules",
          estMinutes: 2,
        },
        "version"
      )
    );
  }

  // Each `allow <ops> [: if <cond>];` statement.
  const allowRe = /allow\s+([a-zA-Z][a-zA-Z ,]*?)\s*(?::\s*if\s+([\s\S]*?))?;/g;
  let m: RegExpExecArray | null;
  let matched = false;
  while ((m = allowRe.exec(text))) {
    matched = true;
    const ops = m[1].trim().toLowerCase().replace(/\s+/g, " ");
    const rawCond = (m[2] ?? "true").trim();
    const cond = rawCond.replace(/\s+/g, " ").toLowerCase();
    const hasWrite = /\b(write|create|update|delete)\b/.test(ops);
    const line = lineOf(text, m.index);
    const snippet = m[0].trim().slice(0, 160);
    const key = `${ops}@${line}`;

    if (cond === "true") {
      findings.push(
        mk(
          "fs-allow-true",
          hasWrite ? "CRITICAL" : "HIGH",
          hasWrite
            ? `规则对所有人开放读写（allow ${ops}: if true）`
            : `规则对所有人开放读取（allow ${ops}: if true）`,
          "该 allow 条件恒真，任何人（含未登录用户）都能直接访问，等同于数据库完全裸奔。",
          { rule: snippet, line },
          {
            summary: "移除 if true，改为基于 request.auth 与数据归属的最小权限条件。",
            steps: [
              "定位 Firestore → Rules 中该 match 块",
              "把 if true 改为如 if request.auth != null && request.auth.uid == resource.data.ownerId",
              "对公开可读的集合也应显式限定字段与操作，而非整体放开",
            ],
            consolePath: "Firestore → Rules",
            estMinutes: 20,
          },
          key
        )
      );
    } else if (/request\.time\s*<|timestamp\.date\(/.test(cond)) {
      findings.push(
        mk(
          "fs-test-mode",
          "HIGH",
          `疑似测试模式规则（基于时间的临时放开：allow ${ops}）`,
          "规则用 request.time < timestamp 做时间限制，是 Firebase「测试模式」默认写法——到期前对所有人开放，极易忘记收紧。",
          { rule: snippet, line },
          {
            summary: "去掉时间限制，改为正式的身份/归属校验。",
            steps: [
              "移除 request.time < timestamp.date(...) 这类条件",
              "改为 request.auth != null 及数据归属校验",
            ],
            consolePath: "Firestore → Rules",
            estMinutes: 15,
          },
          key
        )
      );
    } else if (hasWrite && !/request\.auth/.test(cond)) {
      findings.push(
        mk(
          "fs-write-no-auth",
          "HIGH",
          `写操作未校验登录（allow ${ops} 缺少 request.auth）`,
          "该写规则的条件里没有对 request.auth 做校验，未登录用户可能即可写入。",
          { rule: snippet, line },
          {
            summary: "写操作至少要求 request.auth != null，并校验数据归属。",
            steps: [
              "在条件中加入 request.auth != null",
              "进一步校验 request.auth.uid 与被写文档的归属字段一致",
            ],
            consolePath: "Firestore → Rules",
            estMinutes: 15,
          },
          key
        )
      );
    }
  }

  if (!matched && text.trim().length > 0) {
    findings.push(
      mk(
        "fs-no-allow",
        "INFO",
        "未解析到 allow 规则",
        "未在提供的内容里解析到任何 allow 语句。请确认粘贴的是完整的 firestore.rules 内容。",
        {},
        {
          summary: "提供完整的 firestore.rules 文件内容。",
          steps: ["让 AI 助手输出 firestore.rules 的完整原文再试"],
          estMinutes: 2,
        },
        "noallow"
      )
    );
  }

  return {
    findings,
    riskCounts: riskCounts(findings),
    score: safetyScore(findings),
    tableCount: 0,
    meta: { errors: [], source: "firestore_rules" },
  };
}
