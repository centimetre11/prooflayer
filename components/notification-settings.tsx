"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Pref = {
  emailAlerts: boolean;
  weeklyDigest: boolean;
  scanComplete: boolean;
};

export function NotificationSettings() {
  const [pref, setPref] = useState<Pref | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((d: Pref) => setPref(d))
      .catch(() => setMsg("加载失败"));
  }, []);

  async function save() {
    if (!pref) return;
    setMsg(null);
    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pref),
    });
    if (!res.ok) {
      setMsg("保存失败");
      return;
    }
    setMsg("已保存");
    startTransition(() => undefined);
  }

  if (!pref) {
    return <p className="text-sm text-[var(--color-muted)]">加载通知偏好…</p>;
  }

  const rows: { key: keyof Pref; label: string; hint: string }[] = [
    {
      key: "emailAlerts",
      label: "高危告警邮件",
      hint: "监测发现 CRITICAL/HIGH 回退时发送",
    },
    {
      key: "weeklyDigest",
      label: "每周安全摘要",
      hint: "每周一汇总各应用评分与未关闭告警",
    },
    {
      key: "scanComplete",
      label: "体检完成通知",
      hint: "扫描结束后发送结果摘要（默认关闭）",
    },
  ];

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <label
          key={row.key}
          className="flex cursor-pointer items-start justify-between gap-4"
        >
          <span>
            <span className="block text-sm font-medium">{row.label}</span>
            <span className="block text-xs text-[var(--color-muted)]">
              {row.hint}
            </span>
          </span>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            checked={pref[row.key]}
            disabled={pending}
            onChange={(e) =>
              setPref((p) => (p ? { ...p, [row.key]: e.target.checked } : p))
            }
          />
        </label>
      ))}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending}>
          保存偏好
        </Button>
        {msg ? <span className="text-xs text-[var(--color-muted)]">{msg}</span> : null}
      </div>
    </div>
  );
}
