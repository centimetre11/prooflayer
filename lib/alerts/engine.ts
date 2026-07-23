import { prisma } from "@/lib/db";
import { recordRemediation } from "@/lib/evidence/chain";
import type { Alert, Severity } from "@prisma/client";

const HIGH_PRIORITY: Severity[] = ["CRITICAL", "HIGH"];

/**
 * Reconcile alerts for an app against the findings of its latest scan.
 * - Opens a high-priority alert for newly-seen CRITICAL/HIGH findings.
 * - Auto-resolves open alerts whose finding disappeared (treated as fixed),
 *   writing a remediation record into the evidence chain.
 * Returns the alerts that were newly opened (candidates for notification).
 */
export async function syncAlertsForApp(
  appId: string,
  scanId: string
): Promise<{ opened: Alert[]; resolved: Alert[] }> {
  const findings = await prisma.scanFinding.findMany({ where: { scanId } });
  const highPriority = findings.filter((f) => HIGH_PRIORITY.includes(f.severity));
  const currentFps = new Set(highPriority.map((f) => f.fingerprint));

  // Active = not yet resolved (OPEN or ACK). Used for both de-dupe and resolution.
  const activeAlerts = await prisma.alert.findMany({
    where: { appId, state: { in: ["OPEN", "ACK"] } },
  });
  const activeByFp = new Map(activeAlerts.map((a) => [a.fingerprint, a]));

  const opened: Alert[] = [];
  for (const f of highPriority) {
    if (activeByFp.has(f.fingerprint)) continue;
    const alert = await prisma.alert.create({
      data: {
        appId,
        ruleId: f.ruleId,
        fingerprint: f.fingerprint,
        severity: f.severity,
        title: f.title,
        detail: f.description,
        state: "OPEN",
      },
    });
    opened.push(alert);
  }

  const resolved: Alert[] = [];
  for (const a of activeAlerts) {
    if (currentFps.has(a.fingerprint)) continue;
    const updated = await prisma.alert.update({
      where: { id: a.id },
      data: { state: "RESOLVED", resolvedAt: new Date() },
    });
    await recordRemediation(appId, a.fingerprint, "open", "verified");
    resolved.push(updated);
  }

  return { opened, resolved };
}

export async function ackAlert(id: string) {
  return prisma.alert.update({
    where: { id },
    data: { state: "ACK", ackedAt: new Date() },
  });
}

export async function resolveAlert(id: string) {
  const alert = await prisma.alert.update({
    where: { id },
    data: { state: "RESOLVED", resolvedAt: new Date() },
  });
  await recordRemediation(alert.appId, alert.fingerprint, "open", "manual-resolved");
  return alert;
}

export async function markNotified(ids: string[]) {
  if (!ids.length) return;
  await prisma.alert.updateMany({
    where: { id: { in: ids } },
    data: { lastNotifiedAt: new Date(), notifyCount: { increment: 1 } },
  });
}

/**
 * Anti-fatigue: at most 2 high-priority notifications per app per 30 days.
 * Returns the subset of alerts that may be notified now.
 */
export async function throttleNotifications(
  appId: string,
  candidates: Alert[]
): Promise<Alert[]> {
  if (!candidates.length) return [];
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recent = await prisma.alert.count({
    where: { appId, lastNotifiedAt: { gte: since } },
  });
  const budget = Math.max(0, 2 - recent);
  return candidates.slice(0, budget);
}
