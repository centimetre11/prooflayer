import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

/** Emails listed in ADMIN_EMAILS (comma-separated) are treated as admins. */
export function envAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminRole(role: UserRole | undefined | null, email?: string | null) {
  if (role === "ADMIN") return true;
  if (email && envAdminEmails().has(email.toLowerCase())) return true;
  return false;
}

/** Promote env-listed admins in DB so role sticks across sessions. */
export async function syncEnvAdminRole(userId: string, email: string | null | undefined) {
  if (!email || !envAdminEmails().has(email.toLowerCase())) return;
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ role: { not: "ADMIN" } }, { status: { not: "ACTIVE" } }] },
    data: { role: "ADMIN", status: "ACTIVE" },
  });
}
