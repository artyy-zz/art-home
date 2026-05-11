"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { preload } from "swr";
import {
  BarChart3,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  ClipboardList,
  FileMinus2,
  FileText,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Receipt,
  ShoppingCart,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import type { PermissionModuleKey } from "@/lib/permissions-config";
import { cn } from "@/lib/utils";

const iconClass = "h-4 w-4 shrink-0";

const optionResourceByModule: Partial<Record<PermissionModuleKey, string>> = {
  OFFERS: "offers",
  INVOICES: "invoices",
  PURCHASE_INVOICES: "purchase-invoices",
  DELIVERY_NOTES: "delivery-notes",
  EXPENSES: "expenses",
  DEBIT_NOTES: "debit-notes",
  STOQET: "stoqet",
};

const sidebarFetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("Prefetch failed");
    }
    return response.json();
  });

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
  const router = useRouter();
  const dict = getDictionary(locale);
  const visible = useMemo(() => new Set(visibleModules), [visibleModules]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = useMemo<Array<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    module: PermissionModuleKey;
    exact?: boolean;
  }>>(
    () =>
      [
        {
          href: `/${locale}/admin`,
          label: dict.admin.dashboard,
          icon: LayoutDashboard,
          module: "DASHBOARD" as const,
          exact: true,
        },
        { href: `/${locale}/admin/leads`, label: dict.admin.leads, icon: ClipboardList, module: "LEADS" as const },
        { href: `/${locale}/admin/clients`, label: dict.admin.clients, icon: Users, module: "CLIENTS" as const },
        { href: `/${locale}/admin/suppliers`, label: dict.admin.suppliers, icon: Truck, module: "SUPPLIERS" as const },
        { href: `/${locale}/admin/inventory`, label: dict.admin.inventory, icon: Boxes, module: "INVENTORY" as const },
        { href: `/${locale}/admin/stoqet`, label: dict.admin.stoqet, icon: PackageCheck, module: "STOQET" as const },
        { href: `/${locale}/admin/assets-inventory`, label: dict.admin.assetsInventory, icon: ClipboardList, module: "ASSETS_INVENTORY" as const },
        { href: `/${locale}/admin/offers`, label: dict.admin.offers, icon: FileText, module: "OFFERS" as const },
        { href: `/${locale}/admin/invoices`, label: dict.admin.invoices, icon: Receipt, module: "INVOICES" as const },
        { href: `/${locale}/admin/purchase-invoices`, label: dict.admin.purchaseInvoices, icon: ShoppingCart, module: "PURCHASE_INVOICES" as const },
        { href: `/${locale}/admin/delivery-notes`, label: dict.admin.deliveryNotes, icon: ClipboardList, module: "DELIVERY_NOTES" as const },
        { href: `/${locale}/admin/expenses`, label: dict.admin.expenses, icon: WalletCards, module: "EXPENSES" as const },
        { href: `/${locale}/admin/debit-notes`, label: dict.admin.debitNotes, icon: FileMinus2, module: "DEBIT_NOTES" as const },
        { href: `/${locale}/admin/worker-hours`, label: dict.admin.workerHours, icon: Clock3, module: "WORKER_HOURS" as const },
        { href: `/${locale}/admin/users`, label: dict.admin.users, icon: Users, module: "USERS" as const },
        { href: `/${locale}/admin/reports`, label: dict.admin.reports, icon: BarChart3, module: "REPORTS" as const },
      ].filter((item) => visible.has(item.module)),
    [dict, locale, visible],
  );
  const hrefs = useMemo(() => items.map((item) => item.href), [items]);
  const prefetchItem = (item: { href: string; module: PermissionModuleKey }) => {
    router.prefetch(item.href);

    const resource = optionResourceByModule[item.module];
    if (resource) {
      const params = new URLSearchParams({ locale, resource });
      if (resource === "stoqet") {
        params.set("mode", "create");
      }
      void preload(`/api/admin/options?${params.toString()}`, sidebarFetcher);
    }
  };

  useEffect(() => {
    const warmRoutes = () => {
      for (const href of hrefs) {
        if (href !== pathname) {
          router.prefetch(href);
        }
      }
    };

    const timeoutId = setTimeout(warmRoutes, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hrefs, pathname, router]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <div className="panel-card sticky top-3 z-40 flex items-center justify-between gap-3 rounded-[24px] p-3 lg:hidden">
        <Logo href={`/${locale}`} inverse className="[&>span:last-child]:text-xl" />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/82 transition hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/18"
          aria-label={locale === "sq" ? "Hap menune" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/55 p-3 lg:hidden">
          <div className="panel-card flex max-h-[calc(100vh-1.5rem)] w-full max-w-sm flex-col overflow-hidden rounded-[26px] p-4">
            <div className="flex items-center justify-between gap-3">
              <Logo href={`/${locale}`} inverse className="[&>span:last-child]:text-xl" />
              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/82 transition hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/18"
                aria-label={locale === "sq" ? "Mbyll menune" : "Close menu"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-[20px] border border-white/10 bg-white/6 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                {locale === "sq" ? "Panel i mbrojtur" : "Protected panel"}
              </p>
              <p className="mt-2 text-base font-semibold text-white">{userName}</p>
              <p className="mt-1 text-xs text-white/62">{roleLabel}</p>
            </div>

            <nav className="mt-5 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {items.map((item) => {
                const Icon = item.icon;
                const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    onMouseEnter={() => prefetchItem(item)}
                    onFocus={() => prefetchItem(item)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-[#fff7eb] !text-black shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
                        : "text-white/76 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className={iconClass} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      <aside
        className={cn(
          "panel-card sticky top-6 hidden h-[calc(100vh-3rem)] rounded-[28px] p-5 transition-[width] duration-300 lg:flex lg:flex-col",
          collapsed ? "w-24" : "w-80",
        )}
      >
      <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? null : <Logo href={`/${locale}`} inverse />}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/72 transition hover:bg-white/14 hover:text-white"
          aria-label={
            collapsed
              ? locale === "sq"
                ? "Zgjero sidebar"
                : "Expand sidebar"
              : locale === "sq"
                ? "Kompakto sidebar"
                : "Compact sidebar"
          }
          title={
            collapsed
              ? locale === "sq"
                ? "Zgjero"
                : "Expand"
              : locale === "sq"
                ? "Kompakto"
                : "Compact"
          }
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {collapsed ? (
        <div className="mt-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-sm font-semibold text-white">
            {userName.trim().slice(0, 1).toUpperCase()}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-[20px] border border-white/10 bg-white/6 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">
            {locale === "sq" ? "Panel i mbrojtur" : "Protected panel"}
          </p>
          <p className="mt-2 text-base font-semibold text-white">{userName}</p>
          <p className="mt-1 text-xs text-white/62">{roleLabel}</p>
        </div>
      )}

      <nav className={cn("mt-8 flex flex-1 flex-col gap-2 overflow-y-auto pr-1", collapsed && "items-center pr-0")}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onMouseEnter={() => prefetchItem(item)}
              onFocus={() => prefetchItem(item)}
              className={cn(
                "flex items-center rounded-2xl text-sm font-medium transition",
                collapsed ? "h-11 w-11 justify-center" : "gap-3 px-4 py-3",
                active
                  ? "bg-[#fff7eb] !text-black shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
                  : "text-white/76 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className={iconClass} />
              {collapsed ? null : <span className="min-w-0 truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      </aside>
    </>
  );
}
