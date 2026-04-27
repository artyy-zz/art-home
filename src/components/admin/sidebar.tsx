"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  Mail,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { buttonClasses } from "@/components/shared/button";
import { Logo } from "@/components/shared/logo";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import type { PermissionModuleKey } from "@/lib/permissions-config";
import { cn } from "@/lib/utils";

const iconClass = "h-4 w-4";

export function AdminSidebar({
  locale,
  visibleModules,
  userName,
  roleLabel,
}: {
  locale: Locale;
  visibleModules: PermissionModuleKey[];
  userName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const dict = getDictionary(locale);
  const visible = new Set(visibleModules);
  const items: Array<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    module: PermissionModuleKey;
    exact?: boolean;
  }> = [
    {
      href: `/${locale}/admin`,
      label: dict.admin.dashboard,
      icon: LayoutDashboard,
      module: "DASHBOARD" as const,
      exact: true,
    },
    { href: `/${locale}/admin/leads`, label: dict.admin.leads, icon: Mail, module: "LEADS" as const },
    { href: `/${locale}/admin/clients`, label: dict.admin.clients, icon: Users, module: "CLIENTS" as const },
    { href: `/${locale}/admin/inventory`, label: dict.admin.inventory, icon: Boxes, module: "INVENTORY" as const },
    { href: `/${locale}/admin/offers`, label: dict.admin.offers, icon: FileText, module: "OFFERS" as const },
    { href: `/${locale}/admin/invoices`, label: dict.admin.invoices, icon: Receipt, module: "INVOICES" as const },
    { href: `/${locale}/admin/reports`, label: dict.admin.reports, icon: BarChart3, module: "REPORTS" as const },
    { href: `/${locale}/admin/users`, label: dict.admin.users, icon: Users, module: "USERS" as const },
    { href: `/${locale}/admin/roles`, label: dict.admin.roles, icon: ShieldCheck, module: "ROLES" as const },
    { href: `/${locale}/admin/settings`, label: dict.admin.settings, icon: Settings, module: "SETTINGS" as const },
  ].filter((item) => visible.has(item.module));

  return (
    <aside className="panel-card sticky top-6 hidden h-[calc(100vh-3rem)] w-80 rounded-[28px] p-6 lg:flex lg:flex-col">
      <Logo href={`/${locale}`} inverse />
      <div className="mt-8 rounded-[20px] border border-white/10 bg-white/6 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-white/55">
          {locale === "sq" ? "Panel i mbrojtur" : "Protected panel"}
        </p>
        <p className="mt-2 text-base font-semibold text-white">{userName}</p>
        <p className="mt-1 text-xs text-white/62">{roleLabel}</p>
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-[#fff7eb] text-[#1e1a16] shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
                  : "text-white/76 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className={iconClass} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href={`/${locale}`}
        className={buttonClasses({
          variant: "secondary",
          className: "w-full justify-center !bg-[#fff7eb] !text-[#1e1a16] hover:!bg-white",
        })}
      >
        {dict.common.backToWebsite}
      </Link>
    </aside>
  );
}
