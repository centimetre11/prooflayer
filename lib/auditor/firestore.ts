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
        "rules_version = '2' not declared",
        "The rules version is not explicitly declared. We recommend using v2 syntax to gain capabilities such as recursive wildcards.",
        {},
        {
          summary: "Declare rules_version = '2'; on the first line of the rules file.",
          steps: ["Add rules_version = '2'; at the top of firestore.rules"],
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
            ? `Rule grants read/write to everyone (allow ${ops}: if true)`
            : `Rule grants read access to everyone (allow ${ops}: if true)`,
          "This allow condition is always true, so anyone (including unauthenticated users) can access the data directly — the database is completely exposed.",
          { rule: snippet, line },
          {
            summary: "Remove if true and replace it with a least-privilege condition based on request.auth and data ownership.",
            steps: [
              "Locate this match block under Firestore → Rules",
              "Change if true to something like if request.auth != null && request.auth.uid == resource.data.ownerId",
              "Even for publicly readable collections, explicitly restrict fields and operations rather than opening everything up",
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
          `Likely test-mode rule (time-based temporary access: allow ${ops})`,
          "The rule uses request.time < timestamp as a time limit, which is Firebase's default \"test mode\" pattern — it's open to everyone until it expires, and it's very easy to forget to tighten it.",
          { rule: snippet, line },
          {
            summary: "Remove the time limit and replace it with proper identity/ownership checks.",
            steps: [
              "Remove conditions like request.time < timestamp.date(...)",
              "Replace them with request.auth != null and data-ownership checks",
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
          `Write operation without login check (allow ${ops} missing request.auth)`,
          "This write rule's condition does not check request.auth, so unauthenticated users may be able to write.",
          { rule: snippet, line },
          {
            summary: "Write operations should at least require request.auth != null and verify data ownership.",
            steps: [
              "Add request.auth != null to the condition",
              "Further verify that request.auth.uid matches the ownership field of the document being written",
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
        "No allow rules parsed",
        "No allow statements were parsed from the provided content. Please confirm that you pasted the complete firestore.rules content.",
        {},
        {
          summary: "Provide the complete contents of the firestore.rules file.",
          steps: ["Have your AI assistant output the full, verbatim firestore.rules and try again"],
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
