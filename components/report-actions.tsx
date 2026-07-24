"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw, Share2, DatabaseZap, Check, Copy } from "lucide-react";

export function ReportActions({
  scanId,
  url,
}: {
  scanId: string;
  url: string;
}) {
  const router = useRouter();
  const [retesting, setRetesting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function retest() {
    setRetesting(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok) router.push(`/scan/${data.scanId}`);
    } finally {
      setRetesting(false);
    }
  }

  async function share() {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId }),
    });
    const data = await res.json();
    if (res.ok) setShareUrl(`${window.location.origin}/share/${data.token}`);
  }

  function copy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={retest} disabled={retesting}>
          <RefreshCw size={15} className={retesting ? "animate-spin" : ""} /> Retest & compare
        </Button>
        <Button variant="secondary" size="sm" onClick={share}>
          <Share2 size={15} /> Create share link
        </Button>
        <Button asChild size="sm">
          <Link href={`/audit?url=${encodeURIComponent(url)}&from=${scanId}`}>
            <DatabaseZap size={15} /> Deep RLS audit
          </Link>
        </Button>
      </div>
      {shareUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs">
          <span className="max-w-[220px] truncate font-mono">{shareUrl}</span>
          <button onClick={copy} className="text-[var(--color-primary)]">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
