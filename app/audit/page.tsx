import { Suspense } from "react";
import { AuditForm } from "@/components/audit-form";

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[var(--color-muted)]">加载中…</div>}>
      <AuditForm />
    </Suspense>
  );
}
