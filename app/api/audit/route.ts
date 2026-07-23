import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runDeepAudit, runPgResultAudit } from "@/lib/auditor/rls";
import { runFirestoreAudit } from "@/lib/auditor/firestore";
import { sealCredential } from "@/lib/auditor/crypto";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  url: z.string().min(3).max(2048),
  // "auto" lets the server figure out what the user pasted (connection string
  // vs Firestore rules) so the UI never has to expose backend types.
  kind: z.enum(["auto", "connection_string", "pat", "firestore_rules"]).default("auto"),
  secret: z.string().min(8),
  projectRef: z.string().optional(),
  persist: z.boolean().optional(),
  appId: z.string().optional(),
});

// If the assistant ran our read-only SQL, it pastes back a JSON envelope we can
// analyze directly (no DB connection from our side).
function tryParsePgEnvelope(
  secret: string
): { tables?: unknown; policies?: unknown; grants?: unknown; functions?: unknown } | null {
  const t = secret.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t);
    if (o && typeof o === "object" && typeof o.prooflayer === "string" && o.prooflayer.startsWith("pg-audit")) {
      return o;
    }
  } catch {
    // not JSON
  }
  return null;
}

// Sniff what the AI assistant handed back, so users don't pick a backend type.
function detectKind(secret: string): "connection_string" | "firestore_rules" | null {
  const s = secret.trim();
  if (/^postgres(ql)?:\/\//i.test(s)) return "connection_string";
  if (/rules_version|service\s+cloud\.firestore/i.test(s)) return "firestore_rules";
  if (/\ballow\s+[a-z]/i.test(s) && /\bmatch\s+\//i.test(s)) return "firestore_rules";
  return null;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { url, secret, projectRef, persist } = parsed.data;

  let kind: "auto" | "connection_string" | "pat" | "firestore_rules" | "pg_result" =
    parsed.data.kind;
  let pgPayload: { tables?: unknown; policies?: unknown; grants?: unknown; functions?: unknown } | null =
    null;
  if (kind === "auto") {
    const envelope = tryParsePgEnvelope(secret);
    if (envelope) {
      kind = "pg_result";
      pgPayload = envelope;
    } else {
      const detected = detectKind(secret);
      if (!detected) {
        return NextResponse.json(
          { error: "没能识别粘贴的内容，请把 AI 助手返回的完整结果原样粘进来再试。" },
          { status: 400 }
        );
      }
      kind = detected;
    }
  }

  const session = await auth().catch(() => null);
  let appId = parsed.data.appId ?? null;
  if (session?.user?.id) {
    const host = (() => {
      try {
        return new URL(url.startsWith("http") ? url : `https://${url}`).host;
      } catch {
        return url;
      }
    })();
    const app =
      (await prisma.app.findFirst({ where: { userId: session.user.id, url } })) ??
      (await prisma.app.create({ data: { userId: session.user.id, name: host, url } }));
    appId = app.id;
  }

  const scan = await prisma.scan.create({
    data: { url, appId: appId ?? undefined, kind: "DEEP", status: "RUNNING", startedAt: new Date() },
  });

  try {
    const result =
      kind === "pg_result"
        ? runPgResultAudit(pgPayload ?? {})
        : kind === "firestore_rules"
          ? runFirestoreAudit(secret)
          : await runDeepAudit({ kind, secret, projectRef });

    await prisma.$transaction([
      prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: "DONE",
          finishedAt: new Date(),
          rulesetVersion: kind === "firestore_rules" ? "firestore-rules-v1" : "deep-audit-v1",
          score: result.score,
          riskCounts: result.riskCounts as unknown as Prisma.InputJsonValue,
          meta: {
            source: result.meta.source,
            tableCount: result.tableCount,
            errors: result.meta.errors,
          } as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.scanFinding.createMany({
        data: result.findings.map((f) => ({
          scanId: scan.id,
          ruleId: f.ruleId,
          category: f.category,
          severity: f.severity,
          title: f.title,
          description: f.description,
          confidence: f.confidence,
          fingerprint: f.fingerprint,
          evidence: f.evidence as unknown as Prisma.InputJsonValue,
          remediation: f.remediation as unknown as Prisma.InputJsonValue,
        })),
      }),
    ]);

    // Credential retention is opt-in; default is burn (never stored).
    // Only a live connection string / PAT is a reusable credential; pasted
    // result sets and Firestore rules are static data and are never persisted.
    if (persist && appId && (kind === "connection_string" || kind === "pat")) {
      const sealed = sealCredential(secret);
      await prisma.auditCredential.upsert({
        where: { appId },
        update: {
          kind,
          ciphertext: sealed.ciphertext,
          encDek: sealed.encDek,
          iv: sealed.iv,
          authTag: sealed.authTag,
          persist: true,
          expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
        },
        create: {
          appId,
          kind,
          ciphertext: sealed.ciphertext,
          encDek: sealed.encDek,
          iv: sealed.iv,
          authTag: sealed.authTag,
          persist: true,
          expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
        },
      });
    }

    return NextResponse.json({ scanId: scan.id });
  } catch (err) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
      },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "audit failed", scanId: scan.id },
      { status: 502 }
    );
  }
}
