"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  AppWindow,
  Mail,
  Newspaper,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "运营",
    items: [{ href: "/admin", label: "概览", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "用户与增长",
    items: [
      { href: "/admin/users", label: "用户", icon: Users },
      { href: "/admin/subscribers", label: "资讯订阅", icon: Newspaper },
    ],
  },
  {
    title: "业务数据",
    items: [
      { href: "/admin/apps", label: "应用", icon: AppWindow },
      { href: "/admin/capabilities", label: "检测能力", icon: ShieldCheck },
    ],
  },
  {
    title: "系统",
    items: [{ href: "/admin/emails", label: "邮件投递", icon: Mail }],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {group.title}
          </p>
          {group.items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[var(--color-surface-2)] font-medium text-[var(--color-primary)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Horizontal nav for the mobile top area. */
export function AdminNavMobile() {
  const pathname = usePathname();
  const items = GROUPS.flatMap((g) => g.items);

  return (
    <nav className="flex gap-1 overflow-x-auto lg:hidden">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-[var(--color-surface-2)] font-medium text-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <Icon size={14} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
