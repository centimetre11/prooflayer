import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { runDeepAudit, runPgResultAudit, type AuditResult } from "@/lib/auditor/rls";
import { runFirestoreAudit } from "@/lib/auditor/firestore";
import { tryParsePgEnvelope, detectKind, type DeepKind } from "@/lib/auditor/detect";
import { recordEvidence, recordHeartbeat } from "@/lib/evidence/chain";
import { syncAlertsForApp, throttleNotifications, markNotified } from "@/lib/alerts/engine";
import { sendEmail } from "@/lib/email/send";
import { alertEmail } from "@/lib/email/templates";

export class DeepInputError extends Error {}

export interface DeepAppContext {
  id: string;
  name: string;
  url: string;
  userEmail?: string | null;
  userId?: string | null;
}

export interface DeepProcessResult {
  scanId: string;
  kind: DeepKind;
  result: AuditResult;
  opened: number;
  resolved: number;
  notified: number;
}

function rulesetVersionFor(kind: DeepKind): string {
  return kind === "firestore_rules" ? "firestore-rules-v1" : "deep-audit-v1";
}

/**
 * The single Layer-2 pipeline shared by the interactive audit and the recurring
 * ingest endpoint:
 *   detect -> analyze -> persist scan+findings -> append evidence -> reconcile
 *   deep alerts -> (optionally) notify.
 *
 * This is what turns a one-off paste into long-term deep monitoring: every
 * result the AI hands back becomes another link in the app's DEEP surface,
 * diffed against the previous baseline so regressions open alerts and fixes
 * resolve them.
 */
export async function processDeepResult(
  secret: string,
  app: DeepAppContext,
  opts: { notify?: boolean; projectRef?: string } = {}
): Promise<DeepProcessResult> {
  const envelope = tryParsePgEnvelope(secret);
  let kind: DeepKind;
  if (envelope) {
    kind = "pg_result";
  } else {
    const detected = detectKind(secret);
    if (!detected) {
      throw new DeepInputError(
        "Couldn't recognize the pasted content. Please paste the full result your AI assistant returned, verbatim, and try again."
      );
    }
    kind = detected;
  }

  const scan = await prisma.scan.create({
    data: {
      url: app.url,
      appId: app.id,
      kind: "DEEP",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  try {
    const result =
      kind === "pg_result"
        ? runPgResultAudit(envelope ?? {})
        : kind === "firestore_rules"
          ? runFirestoreAudit(secret)
          : await runDeepAudit({ kind: "connection_string", secret, projectRef: opts.projectRef });

    await prisma.$transaction([
      prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: "DONE",
          finishedAt: new Date(),
          rulesetVersion: rulesetVersionFor(kind),
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

    // Evidence: tamper-proof baseline snapshot of this deep result + a heartbeat
    // proving continuity of the deep-monitoring cadence.
    await recordEvidence(app.id, "BASELINE", {
      scanId: scan.id,
      surface: "DEEP",
      rulesetVersion: rulesetVersionFor(kind),
      score: result.score,
      riskCounts: result.riskCounts,
      findingFingerprints: result.findings.map((f) => ({
        fp: f.fingerprint,
        ruleId: f.ruleId,
        severity: f.severity,
      })),
    });
    await recordHeartbeat(app.id);

    // Reconcile deep alerts: new critical/high issues open, fixed ones resolve.
    const { opened, resolved } = await syncAlertsForApp(app.id, scan.id, "DEEP");

    let notified = 0;
    if (opts.notify && opened.length > 0 && app.userEmail) {
      const toNotify = await throttleNotifications(app.id, opened);
      if (toNotify.length > 0) {
        const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
        const mail = alertEmail(
          app.name,
          toNotify.map((a) => ({ title: a.title, severity: a.severity })),
          `${base}/dashboard/apps/${app.id}`
        );
        const res = await sendEmail({
          to: app.userEmail,
          userId: app.userId ?? undefined,
          relatedAppId: app.id,
          kind: "ALERT",
          ...mail,
          meta: { alertIds: toNotify.map((a) => a.id) },
        });
        if (res.status === "SENT") {
          await markNotified(toNotify.map((a) => a.id));
          notified = toNotify.length;
        }
      }
    }

    await prisma.app.update({
      where: { id: app.id },
      data: { lastIngestAt: new Date() },
    });

    return { scanId: scan.id, kind, result, opened: opened.length, resolved: resolved.length, notified };
  } catch (err) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
      },
    });
    throw err;
  }
}
