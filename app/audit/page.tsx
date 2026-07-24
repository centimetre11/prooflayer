import { Suspense } from "react";
import { AuditForm } from "@/components/audit-form";
import { requireActiveUser } from "@/lib/access/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  // Layer 2 records results against an account and monitors them long-term,
  // so it requires an active session.
  await requireActiveUser();
  return (
    <Suspense fallback={<div className="p-12 text-center text-[var(--color-muted)]">Loading…</div>}>
      <AuditForm />
    </Suspense>
  );
}
