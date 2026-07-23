import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin/roles";

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

/** For Server Components / pages — redirects if not signed in or not admin. */
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");
  if (!isAdminRole(session.user.role, session.user.email)) {
    redirect("/dashboard");
  }
  return session;
}

/** For Route Handlers — throws AdminAuthError. */
export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user?.id) throw new AdminAuthError("unauthorized", 401);
  if (!isAdminRole(session.user.role, session.user.email)) {
    throw new AdminAuthError("forbidden", 403);
  }
  return session;
}
