"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  AppWindow,
  Mail,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
  { href: "/admin/applications", label: "申请", icon: ClipboardList },
  { href: "/admin/users", label: "用户", icon: Users },
  { href: "/admin/apps", label: "应用", icon: AppWindow },
  { href: "/admin/emails", label: "邮件", icon: Mail },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-[var(--color-surface-2)] text-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
