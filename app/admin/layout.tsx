import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { AdminNav, AdminNavMobile } from "@/components/admin/nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand-mark";
import { ExternalLink } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminPage();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Management top bar — distinct from the marketing site header */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_85%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
              <BrandMark size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">InsightElk Admin</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                Super Admin Console
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/"
              className="hidden items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-foreground)] sm:flex"
            >
              View site <ExternalLink size={13} />
            </Link>
            <span className="hidden max-w-[14rem] truncate text-xs text-[var(--color-muted)] sm:inline">
              {session.user.email}
            </span>
            <SignOutButton className="inline-flex h-8 items-center rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-foreground)] hover:border-[var(--color-primary)] disabled:opacity-50" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-2 lg:hidden">
          <AdminNavMobile />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-5 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20">
            <AdminNav />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
