import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { weeklyDigestEmail } from "@/lib/email/templates";

export interface DigestResult {
  userId: string;
  email: string;
  status: "SENT" | "SKIPPED" | "FAILED";
  error?: string;
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Send a weekly security digest to every user who has apps and digest enabled. */
export async function runWeeklyDigest(): Promise<DigestResult[]> {
  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      apps: { some: {} },
    },
    include: {
      apps: {
        include: {
          scans: { orderBy: { createdAt: "desc" }, take: 1 },
          alerts: { where: { state: { in: ["OPEN", "ACK"] } } },
        },
        orderBy: { createdAt: "desc" },
      },
      notificationPreference: true,
    },
  });

  const results: DigestResult[] = [];
  const base = appUrl();

  for (const user of users) {
    if (!user.email) continue;
    try {
      const mail = weeklyDigestEmail({
        userName: user.name,
        dashboardUrl: `${base}/dashboard`,
        apps: user.apps.map((a) => ({
          name: a.name,
          score: a.scans[0]?.score ?? null,
          openAlerts: a.alerts.length,
          lastScanAt: a.lastScanAt,
        })),
      });
      const res = await sendEmail({
        to: user.email,
        userId: user.id,
        kind: "WEEKLY_DIGEST",
        ...mail,
        meta: { appCount: user.apps.length },
      });
      results.push({
        userId: user.id,
        email: user.email,
        status: res.status === "FAILED" ? "FAILED" : res.status,
      });
    } catch (err) {
      results.push({
        userId: user.id,
        email: user.email,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
