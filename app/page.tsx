import Link from "next/link";
import { ScanForm } from "@/components/scan-form";
import { SubscribeForm } from "@/components/subscribe-form";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileClock,
  Bell,
  KeyRound,
  DatabaseZap,
  ScanLine,
  ArrowRight,
  Mail,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
            <BrandMark size={14} className="text-[var(--color-accent)]" />
            InsightElk · Built for apps that grow out of vibe coding
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Check your app in 60 seconds
            <br />
            <span className="text-[var(--color-primary)]">for leaked database keys</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-[var(--color-muted)]">
            InsightElk is the &ldquo;Compliance Dossier + insurance&rdquo; for AI-generated apps. It starts with a free security check and builds an evidence chain that proves continuous due diligence—so when an incident hits or a customer runs due diligence, you can prove your compliance in one click.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <ScanForm />
          </div>
        </div>

        {/* proof stat */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat value="1,645" label="live Lovable + Supabase apps scanned" />
          <Stat value="170+" label="with missing RLS / USING(true) policies" />
          <Stat value="55%" label="average vulnerability rate in AI-generated code" />
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
          Sources: public CVE-2025-48757 research, Z3 formal verification research
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_40%,transparent)] py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">Three steps—no engineer required</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Step
              n={1}
              icon={<ScanLine size={20} />}
              title="Paste your app URL"
              desc="We render your app in a real browser on the backend, capture the frontend bundle and runtime requests, and detect exposed database keys. No sign-up required."
            />
            <Step
              n={2}
              icon={<DatabaseZap size={20} />}
              title="Optionally connect Supabase"
              desc="Paste read-only credentials for a deep RLS audit. Strictly read-only—we never change anything, and credentials are wiped after use by default."
            />
            <Step
              n={3}
              icon={<FileClock size={20} />}
              title="Get a plain-English report + dossier"
              desc="Three numbers up top: total risks / your most critical issue / estimated minutes to fix. Every scan is preserved as tamper-proof compliance evidence."
            />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <Feature
            icon={<KeyRound size={20} />}
            title="Launch security check (free)"
            desc="Per-table RLS audit, service_role / secret leak scanning, and an inventory of Auth config and exposure surface—plus a risk-ranked plain-English report and an illustrated remediation guide."
          />
          <Feature
            icon={<Bell size={20} />}
            title="Continuous monitoring (subscription)"
            desc="Daily configuration drift detection—AI rewriting code and rolling back RLS is the norm. We only alert on security regressions to prevent alert fatigue."
          />
          <Feature
            icon={<FileClock size={20} />}
            title="Compliance Dossier (your moat)"
            desc="Security baseline history, a four-state remediation loop, and proof of monitoring continuity form a tamper-proof evidence chain. Respond to due diligence / SOC2 pre-audit in one click."
          />
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-[var(--color-muted)]">
            Monitoring is the hook, the dossier is the asset, and governance is the business. You&rsquo;re not selling security—you&rsquo;re selling proof of continuous due diligence.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
          >
            View pricing <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Newsletter — separate from console accounts */}
      <section
        id="subscribe"
        className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_40%,transparent)] py-16"
      >
        <div className="mx-auto max-w-xl px-5 text-center">
          <span className="inline-flex items-center gap-2 text-[var(--color-primary)]">
            <Mail size={18} />
          </span>
          <h2 className="mt-3 text-2xl font-semibold">Sign up for product news by email</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            No account needed. We only send product updates and security news—this email won&rsquo;t create a console account.
          </p>
          <div className="mt-6">
            <SubscribeForm source="homepage" />
          </div>
          <p className="mt-4 text-xs text-[var(--color-muted)]">
            Need monitoring alerts and a Compliance Dossier?{" "}
            <Link href="/register" className="text-[var(--color-primary)] hover:underline">
              Create a console account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <div className="text-3xl font-bold text-[var(--color-primary)]">{value}</div>
        <div className="mt-1 text-sm text-[var(--color-muted)]">{label}</div>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-primary)]">
            {icon}
          </span>
          <span className="text-sm font-medium text-[var(--color-muted)]">Step {n}</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{desc}</p>
      </CardContent>
    </Card>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
          {icon}
        </span>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{desc}</p>
      </CardContent>
    </Card>
  );
}
