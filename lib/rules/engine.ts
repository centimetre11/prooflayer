import { createHash } from "crypto";
import type {
  Finding,
  RuleDefinition,
  RuleSet,
  ScanContext,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function fingerprint(...parts: string[]): string {
  return createHash("sha256").update(parts.join("::")).digest("hex").slice(0, 32);
}

/** Redact all but the first/last few characters of a secret-ish string. */
export function redact(value: string, keep = 6): string {
  if (value.length <= keep * 2) return "*".repeat(value.length);
  return `${value.slice(0, keep)}…${value.slice(-4)} (${value.length} chars)`;
}

/** Shannon entropy (bits/char). */
export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] ?? 0) + 1;
  let e = 0;
  for (const ch in freq) {
    const p = freq[ch] / s.length;
    e -= p * Math.log2(p);
  }
  return e;
}

/** Decode a JWT-ish token's payload without verifying the signature. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function targetText(
  ctx: ScanContext,
  target: string | undefined
): string {
  switch (target) {
    case "html":
      return ctx.html;
    case "networkUrls":
      return ctx.networkUrls.join("\n");
    case "both":
      return `${ctx.html}\n${ctx.assetText}`;
    case "assetText":
    default:
      return ctx.assetText;
  }
}

// ---------------------------------------------------------------------------
// Matchers
// ---------------------------------------------------------------------------

function matchRegex(rule: RuleDefinition, ctx: ScanContext): Finding[] {
  const p = rule.payload as {
    pattern: string;
    flags?: string;
    target?: string;
    redact?: boolean;
    max?: number;
  };
  const text = targetText(ctx, p.target);
  const re = new RegExp(p.pattern, p.flags ?? "gi");
  const seen = new Set<string>();
  const findings: Finding[] = [];
  let m: RegExpExecArray | null;
  const max = p.max ?? 3;
  while ((m = re.exec(text)) && findings.length < max) {
    const raw = m[1] ?? m[0];
    if (seen.has(raw)) continue;
    seen.add(raw);
    findings.push(
      baseFinding(rule, {
        match: p.redact === false ? raw : redact(raw),
      })
    );
    if (!re.global) break;
  }
  return findings;
}

function matchEntropy(rule: RuleDefinition, ctx: ScanContext): Finding[] {
  const p = rule.payload as {
    minEntropy?: number;
    minLen?: number;
    maxLen?: number;
    charClass?: string;
    target?: string;
    max?: number;
  };
  const minEntropy = p.minEntropy ?? 4.2;
  const minLen = p.minLen ?? 24;
  const maxLen = p.maxLen ?? 120;
  const cls = p.charClass ?? "A-Za-z0-9_\\-";
  const text = targetText(ctx, p.target);
  const re = new RegExp(`[${cls}]{${minLen},${maxLen}}`, "g");
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const max = p.max ?? 3;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && findings.length < max) {
    const cand = m[0];
    if (seen.has(cand)) continue;
    if (shannonEntropy(cand) < minEntropy) continue;
    // skip obvious non-secrets (all one char class repeated, base64 of html, etc.)
    if (/^(https?|data|image|font|svg)/i.test(cand)) continue;
    // skip strings already covered by precise rules (JWTs and known key prefixes)
    if (/^(eyJ|sk-|sk_|rk_|pk_|AKIA|AIza|gh[pousr]_|sb_(secret|publishable)_)/.test(cand))
      continue;
    seen.add(cand);
    findings.push(
      baseFinding(rule, {
        match: redact(cand),
        entropy: Number(shannonEntropy(cand).toFixed(2)),
      })
    );
  }
  return findings;
}

function matchJwtDecode(rule: RuleDefinition, ctx: ScanContext): Finding[] {
  const p = rule.payload as {
    requireRole?: string;
    requireIss?: string;
  };
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const tok of ctx.tokens) {
    const payload = decodeJwtPayload(tok.value);
    if (!payload) continue;
    const role = String(payload.role ?? "");
    const iss = String(payload.iss ?? "");
    if (p.requireIss && !iss.includes(p.requireIss)) continue;
    if (p.requireRole && role !== p.requireRole) continue;
    const key = `${role}:${tok.value.slice(0, 12)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push(
      baseFinding(
        rule,
        {
          role,
          iss,
          where: tok.where,
          token: redact(tok.value),
        },
        // fingerprint keyed by role so the same leaked key dedupes across scans
        [rule.id, role]
      )
    );
  }
  return findings;
}

async function matchHttpProbe(
  rule: RuleDefinition,
  ctx: ScanContext
): Promise<Finding[]> {
  const p = rule.payload as {
    base?: "supabase" | "origin";
    path: string;
    method?: string;
    headers?: Record<string, string>;
    expectStatus?: number[];
    bodyIncludes?: string;
    bodyExcludes?: string;
    jsonTrue?: string; // dot-path expected to be truthy
    jsonFalse?: string; // dot-path expected to be falsy
    timeoutMs?: number;
  };
  const base = p.base === "origin" ? ctx.origin : ctx.supabaseUrl;
  if (!base) return [];
  const url = base.replace(/\/$/, "") + p.path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), p.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      method: p.method ?? "GET",
      headers: {
        "User-Agent": process.env.SCANNER_USER_AGENT ?? "ProoflayerBot/1.0",
        ...(p.headers ?? {}),
      },
      signal: controller.signal,
    });
    const status = res.status;
    const text = await res.text().catch(() => "");
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }

    let hit = true;
    if (p.expectStatus && !p.expectStatus.includes(status)) hit = false;
    if (p.bodyIncludes && !text.includes(p.bodyIncludes)) hit = false;
    if (p.bodyExcludes && text.includes(p.bodyExcludes)) hit = false;
    if (p.jsonTrue && !getPath(json, p.jsonTrue)) hit = false;
    if (p.jsonFalse && getPath(json, p.jsonFalse)) hit = false;

    if (!hit) return [];
    return [
      baseFinding(rule, {
        probedUrl: url,
        status,
        sample: text.slice(0, 240),
      }),
    ];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ---------------------------------------------------------------------------
// Finding factory + engine
// ---------------------------------------------------------------------------

function baseFinding(
  rule: RuleDefinition,
  evidence: Record<string, unknown>,
  fpParts?: string[]
): Finding {
  return {
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    title: rule.title,
    description: rule.description,
    confidence: rule.confidence ?? 80,
    remediation: rule.remediation,
    evidence,
    fingerprint: fingerprint(...(fpParts ?? [rule.id, JSON.stringify(evidence)])),
  };
}

export async function evaluateRuleSet(
  ruleset: RuleSet,
  ctx: ScanContext
): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const rule of ruleset.rules) {
    if (rule.enabled === false) continue;
    try {
      switch (rule.matcherType) {
        case "regex":
          out.push(...matchRegex(rule, ctx));
          break;
        case "entropy":
          out.push(...matchEntropy(rule, ctx));
          break;
        case "jwt_decode":
          out.push(...matchJwtDecode(rule, ctx));
          break;
        case "http_probe":
          out.push(...(await matchHttpProbe(rule, ctx)));
          break;
      }
    } catch (err) {
      ctx.errors.push(
        `rule ${rule.id} failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  // de-dupe by fingerprint, keeping the highest-severity/confidence instance
  const byFp = new Map<string, Finding>();
  for (const f of out) {
    const existing = byFp.get(f.fingerprint);
    if (!existing || f.confidence > existing.confidence) byFp.set(f.fingerprint, f);
  }
  return [...byFp.values()];
}
