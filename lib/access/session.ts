import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin/roles";

/** Require an ACTIVE (or ADMIN) session for the user console. */
export async function requireActiveUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const ok =
    isAdminRole(session.user.role, session.user.email) ||
    session.user.status === "ACTIVE";
  if (!ok) redirect("/login?error=inactive");
  return session;
}
