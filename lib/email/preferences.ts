import type { EmailKind, NotificationPreference } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function ensureNotificationPreference(
  userId: string
): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/** Whether this email kind is allowed for the user right now. */
export async function canSendEmailKind(
  userId: string | undefined | null,
  kind: EmailKind
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Transactional auth mail always goes out.
  if (kind === "MAGIC_LINK" || kind === "SYSTEM") return { ok: true };
  if (!userId) return { ok: true };

  const pref = await ensureNotificationPreference(userId);
  if (pref.quietUntil && pref.quietUntil > new Date()) {
    return { ok: false, reason: `quiet until ${pref.quietUntil.toISOString()}` };
  }
  if (kind === "ALERT" && !pref.emailAlerts) {
    return { ok: false, reason: "email alerts disabled" };
  }
  if (kind === "WEEKLY_DIGEST" && !pref.weeklyDigest) {
    return { ok: false, reason: "weekly digest disabled" };
  }
  if (kind === "SCAN_COMPLETE" && !pref.scanComplete) {
    return { ok: false, reason: "scan complete emails disabled" };
  }
  return { ok: true };
}
