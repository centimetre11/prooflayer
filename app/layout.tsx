import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BrandMark, BRAND_NAME } from "@/components/brand-mark";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin/roles";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — 为 vibe 应用提供持续尽责的证明`,
  description:
    "AI 生成应用的合规档案 + 保险。从免费安全体检切入，以治理订阅和合规档案为收入主体。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

async function SiteHeader() {
  const session = await auth();
  const showAdmin = isAdminRole(session?.user?.role, session?.user?.email);
  const loggedIn =
    !!session?.user &&
    (showAdmin || session.user.status === "ACTIVE");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_82%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
            <BrandMark size={18} />
          </span>
          <span className="text-lg tracking-tight">{BRAND_NAME}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[var(--color-muted)] sm:gap-5">
          <Link href="/#how" className="hidden hover:text-[var(--color-foreground)] sm:block">
            工作原理
          </Link>
          <Link href="/pricing" className="hover:text-[var(--color-foreground)]">
            定价
          </Link>
          {loggedIn ? (
            <Link href="/dashboard" className="hover:text-[var(--color-foreground)]">
              控制台
            </Link>
          ) : (
            <Link href="/apply" className="hover:text-[var(--color-foreground)]">
              申请使用
            </Link>
          )}
          {showAdmin ? (
            <Link href="/admin" className="hover:text-[var(--color-primary)]">
              后台
            </Link>
          ) : null}
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
          >
            {loggedIn ? "进入控制台" : "登录"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] py-8 text-sm text-[var(--color-muted)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {BRAND_NAME} · 为 vibe coding 长成业务的应用提供持续尽责的证明
        </p>
        <p className="text-xs">
          仅提供检测工具，非安全担保方 · 默认只告警不阻断
        </p>
      </div>
    </footer>
  );
}
