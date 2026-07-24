"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

const STAGES = [
  "Opening your app in a real browser…",
  "Capturing frontend code and runtime requests…",
  "Checking your database door locks (RLS)…",
  "Scanning for leaked keys and passwords…",
  "Probing Auth and exposure surface configuration…",
  "Generating a plain-language report…",
];

export default function ScanProgress() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2500);

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/${params.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "DONE") {
          clearInterval(poll);
          clearInterval(stageTimer);
          router.replace(`/report/${params.id}`);
        } else if (data.status === "FAILED") {
          clearInterval(poll);
          clearInterval(stageTimer);
          setFailed(data.error ?? "Scan failed");
        }
      } catch {
        /* keep polling */
      }
    }, 1500);

    return () => {
      clearInterval(poll);
      clearInterval(stageTimer);
    };
  }, [params.id, router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5">
      <Card className="w-full">
        <CardContent className="p-10 text-center">
          {failed ? (
            <>
              <ShieldAlert size={40} className="mx-auto text-[var(--color-critical)]" />
              <h1 className="mt-4 text-xl font-semibold">Scan could not be completed</h1>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{failed}</p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 text-sm text-[var(--color-primary)] hover:underline"
              >
                Go back and retry
              </button>
            </>
          ) : (
            <>
              <Loader2 size={40} className="mx-auto animate-spin text-[var(--color-primary)]" />
              <h1 className="mt-4 text-xl font-semibold">Running a security check on your app</h1>
              <p className="mt-2 min-h-6 text-[var(--color-muted)]">{STAGES[stage]}</p>
              <div className="mt-6 space-y-2 text-left">
                {STAGES.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm ${
                      i <= stage ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)] opacity-50"
                    }`}
                  >
                    {i < stage ? (
                      <CheckCircle2 size={16} className="text-[var(--color-accent)]" />
                    ) : i === stage ? (
                      <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-[var(--color-border)]" />
                    )}
                    {s}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
