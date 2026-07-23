import { requireAdminPage } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 lg:flex-row">
      <aside className="lg:w-52 lg:shrink-0">
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
            运营后台
          </p>
          <h1 className="text-lg font-semibold">InsightElk Admin</h1>
        </div>
        <AdminNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
