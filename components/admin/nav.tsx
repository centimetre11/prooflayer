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
    title: "Operations",
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Users & Growth",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/subscribers", label: "Newsletter", icon: Newspaper },
    ],
  },
  {
    title: "Business Data",
    items: [
      { href: "/admin/apps", label: "Applications", icon: AppWindow },
      { href: "/admin/capabilities", label: "Capabilities", icon: ShieldCheck },
    ],
  },
  {
    title: "System",
    items: [{ href: "/admin/emails", label: "Email Delivery", icon: Mail }],
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
