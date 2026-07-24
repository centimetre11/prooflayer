import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BrandMark, BRAND_NAME } from "@/components/brand-mark";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/site-chrome";
import { SignOutButton } from "@/components/auth/sign-out-button";
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
  title: `${BRAND_NAME} — Proof of continuous due diligence for vibe-coded apps`,
  description:
    "The Compliance Dossier + insurance for AI-generated apps. Start with a free security check, with governance subscriptions and the Compliance Dossier as the core of revenue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </SiteChrome>
        </Providers>
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
        <nav className="flex items-center gap-3 text-sm text-[var(--color-muted)] sm:gap-5">
          <Link href="/#how" className="hidden hover:text-[var(--color-foreground)] sm:block">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-[var(--color-foreground)]">
            Pricing
          </Link>
          {showAdmin ? (
            <Link
              href="/admin"
              className="rounded-lg border border-[var(--color-primary)] px-3 py-1.5 font-medium text-[var(--color-primary)] hover:brightness-110"
            >
              Admin
            </Link>
          ) : loggedIn ? (
            <Link href="/dashboard" className="hover:text-[var(--color-foreground)]">
              Console
            </Link>
          ) : (
            <Link href="/register" className="hidden hover:text-[var(--color-foreground)] sm:block">
              Sign up
            </Link>
          )}
          {loggedIn ? (
            <>
              <span className="hidden max-w-[12rem] truncate text-xs sm:inline">
                {session?.user?.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
            >
              Sign in
            </Link>
          )}
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
          {BRAND_NAME} · Proof of continuous due diligence for apps that grow out of vibe coding
        </p>
        <p className="text-xs">
          Detection tools only, not a security guarantor · Alerts only, never blocks, by default
        </p>
      </div>
    </footer>
  );
}
