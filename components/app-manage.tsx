"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pencil, Trash2, Loader2, Check, X } from "lucide-react";

export function AppManage({
  appId,
  appUrl,
  appName,
}: {
  appId: string;
  appUrl: string;
  appName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [rescanning, setRescanning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(appName);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rescan() {
    setError(null);
    setRescanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: appUrl, appId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start check");
      router.push(`/scan/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setRescanning(false);
    }
  }

  function saveName() {
    const next = name.trim();
    if (!next || next === appName) {
      setEditing(false);
      setName(appName);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        setError("Rename failed");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/apps/${appId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Delete failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={rescan} disabled={rescanning}>
          {rescanning ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Starting…
            </>
          ) : (
            <>
              <RefreshCw size={15} /> Re-run check
            </>
          )}
        </Button>

        {editing ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setEditing(false);
                  setName(appName);
                }
              }}
              className="h-8 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
            <Button size="sm" variant="secondary" onClick={saveName} disabled={pending}>
              <Check size={15} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setName(appName);
              }}
            >
              <X size={15} />
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Rename
          </Button>
        )}

        {confirmDelete ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-critical)_40%,transparent)] px-2 py-1">
            <span className="text-xs text-[var(--color-critical)]">
              Delete this app and all its scans?
            </span>
            <Button size="sm" variant="danger" onClick={remove} disabled={pending}>
              {pending ? <Loader2 size={15} className="animate-spin" /> : "Delete"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="text-[var(--color-critical)] hover:bg-[color-mix(in_srgb,var(--color-critical)_10%,transparent)]"
          >
            <Trash2 size={15} /> Delete
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-sm text-[var(--color-critical)]">{error}</p>
      ) : null}
    </div>
  );
}
