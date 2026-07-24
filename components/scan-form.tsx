"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

export function ScanForm({ size = "lg" }: { size?: "md" | "lg" }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start scan");
      router.push(`/scan/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your app URL, e.g. myapp.lovable.app"
            className={`w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] ${
              size === "lg" ? "h-12" : "h-10"
            }`}
          />
        </div>
        <Button type="submit" size={size} disabled={loading} className="shrink-0">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Starting…
            </>
          ) : (
            "Free security check"
          )}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--color-critical)]">{error}</p>}
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Run your first scan with zero signup · Read-only · We never change anything on your end
      </p>
    </form>
  );
}
