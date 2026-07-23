import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import type { Prisma, EvidenceType } from "@prisma/client";
import type { ScanResult } from "@/lib/scanner/pipeline";

const GENESIS = "0".repeat(64);

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/**
 * Canonical JSON with recursively sorted object keys. Required because Postgres
 * jsonb does not preserve key order — without canonicalization, the payload hash
 * recomputed on read would not match the one computed on write.
 */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

/**
 * Append a tamper-evident record to an app's evidence chain.
 * chain_hash = sha256(prev_hash || payload_hash || created_at)
 */
export async function recordEvidence(
  appId: string,
  type: EvidenceType,
  payload: Record<string, unknown>
) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.evidenceRecord.findFirst({
      where: { appId },
      orderBy: { seq: "desc" },
    });
    const seq = (last?.seq ?? 0) + 1;
    const prevHash = last?.chainHash ?? GENESIS;
    const createdAt = new Date();
    const payloadHash = sha256(canonical(payload));
    const chainHash = sha256(`${prevHash}${payloadHash}${createdAt.toISOString()}`);

    return tx.evidenceRecord.create({
      data: {
        appId,
        seq,
        type,
        payload: payload as unknown as Prisma.InputJsonValue,
        payloadHash,
        prevHash,
        chainHash,
        createdAt,
      },
    });
  });
}

export async function recordBaselineEvidence(
  appId: string,
  scanId: string,
  result: ScanResult
) {
  return recordEvidence(appId, "BASELINE", {
    scanId,
    rulesetVersion: result.rulesetVersion,
    score: result.score,
    riskCounts: result.riskCounts,
    findingFingerprints: result.findings.map((f) => ({
      fp: f.fingerprint,
      ruleId: f.ruleId,
      severity: f.severity,
    })),
  });
}

export async function recordHeartbeat(appId: string) {
  return recordEvidence(appId, "HEARTBEAT", { at: new Date().toISOString() });
}

export async function recordRemediation(
  appId: string,
  fingerprint: string,
  from: string,
  to: string
) {
  return recordEvidence(appId, "REMEDIATION", { fingerprint, from, to });
}

export interface ChainVerification {
  ok: boolean;
  length: number;
  brokenAt?: number;
}

/** Replay the whole chain and confirm every link is intact. */
export async function verifyChain(appId: string): Promise<ChainVerification> {
  const records = await prisma.evidenceRecord.findMany({
    where: { appId },
    orderBy: { seq: "asc" },
  });

  let prevHash = GENESIS;
  for (const r of records) {
    const payloadHash = sha256(canonical(r.payload));
    const expected = sha256(`${prevHash}${r.payloadHash}${r.createdAt.toISOString()}`);
    if (r.prevHash !== prevHash || r.payloadHash !== payloadHash || r.chainHash !== expected) {
      return { ok: false, length: records.length, brokenAt: r.seq };
    }
    prevHash = r.chainHash;
  }
  return { ok: true, length: records.length };
}
