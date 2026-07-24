import { prisma } from "@/lib/db";
import { runExternalScan } from "@/lib/scanner/pipeline";
import { createPendingScan, saveScanResult, failScan } from "@/lib/scanner/persist";
import { recordBaselineEvidence, recordHeartbeat } from "@/lib/evidence/chain";
import {
  syncAlertsForApp,
  throttleNotifications,
  markNotified,
} from "@/lib/alerts/engine";
import { sendEmail, alertEmail } from "@/lib/email";

export interface AppMonitorResult {
  appId: string;
  appName: string;
  scanId?: string;
  score?: number;
  opened: number;
  resolved: number;
  notified: number;
  error?: string;
}

/** Run one monitoring cycle for a single app: re-scan -> evidence -> alerts -> notify. */
export async function runMonitoringForApp(appId: string): Promise<AppMonitorResult> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: { user: true },
  });
  if (!app) return { appId, appName: "?", opened: 0, resolved: 0, notified: 0, error: "not found" };

  const scan = await createPendingScan(app.url, app.id, "MONITOR");
  try {
    const result = await runExternalScan(app.url);
    await saveScanResult(scan.id, result);

    await prisma.app.update({
      where: { id: app.id },
      data: {
        lastScanAt: new Date(),
        supabaseUrl: result.meta.supabaseUrl,
        projectRef: result.meta.supabaseRef,
      },
    });

    // Evidence: new baseline snapshot + a monitoring heartbeat (continuity proof).
    await recordBaselineEvidence(app.id, scan.id, result);
    await recordHeartbeat(app.id);

    // Alerts: only security regressions (newly-appeared high/critical) get opened.
    // Scoped to the EXTERNAL surface so deep alerts are left untouched.
    const { opened, resolved } = await syncAlertsForApp(app.id, scan.id, "EXTERNAL");

    let notified = 0;
    if (opened.length > 0 && app.user?.email) {
      const toNotify = await throttleNotifications(app.id, opened);
      if (toNotify.length > 0) {
        const base = (process.env.APP_URL ?? "http://localhost:3000").replace(
          /\/$/,
          ""
        );
        const mail = alertEmail(
          app.name,
          toNotify.map((a) => ({ title: a.title, severity: a.severity })),
          `${base}/dashboard/apps/${app.id}`
        );
        const res = await sendEmail({
          to: app.user.email,
          userId: app.user.id,
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

    return {
      appId: app.id,
      appName: app.name,
      scanId: scan.id,
      score: result.score,
      opened: opened.length,
      resolved: resolved.length,
      notified,
    };
  } catch (err) {
    await failScan(scan.id, err instanceof Error ? err.message : String(err));
    return {
      appId: app.id,
      appName: app.name,
      opened: 0,
      resolved: 0,
      notified: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run monitoring for every enabled app that is due (last scan > ~20h ago). */
export async function runMonitoringCycle(force = false): Promise<AppMonitorResult[]> {
  const dueBefore = new Date(Date.now() - 20 * 3600 * 1000);
  const apps = await prisma.app.findMany({
    where: {
      monitoringEnabled: true,
      ...(force
        ? {}
        : { OR: [{ lastScanAt: null }, { lastScanAt: { lt: dueBefore } }] }),
    },
    select: { id: true },
  });

  const results: AppMonitorResult[] = [];
  for (const a of apps) {
    results.push(await runMonitoringForApp(a.id));
  }
  return results;
}
