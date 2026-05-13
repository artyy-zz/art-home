"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Plus, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buttonClasses } from "@/components/shared/button";
import type { Locale } from "@/lib/i18n";
import type { PermissionModuleKey } from "@/lib/permissions-config";
import { cn } from "@/lib/utils";

const createTargets: Record<
  string,
  { module: PermissionModuleKey; label: Record<Locale, string> }
> = {
  clients: { module: "CLIENTS", label: { sq: "Shto klient", en: "Add client" } },
  suppliers: { module: "SUPPLIERS", label: { sq: "Shto furnitor", en: "Add supplier" } },
  inventory: { module: "INVENTORY", label: { sq: "Shto artikull", en: "Add item" } },
  stoqet: { module: "STOQET", label: { sq: "Shto Stok", en: "Add Stock" } },
  "assets-inventory": { module: "ASSETS_INVENTORY", label: { sq: "Shto në Inventar", en: "Add Asset" } },
  offers: { module: "OFFERS", label: { sq: "Shto oferte", en: "Add offer" } },
  invoices: { module: "INVOICES", label: { sq: "Shto fature", en: "Add invoice" } },
  "purchase-invoices": {
    module: "PURCHASE_INVOICES",
    label: { sq: "Shto faturë blerjeje", en: "Add purchase invoice" },
  },
  "delivery-notes": {
    module: "DELIVERY_NOTES",
    label: { sq: "Shto fletë dërgesë", en: "Add delivery note" },
  },
  expenses: { module: "EXPENSES", label: { sq: "Shto shpenzim", en: "Add expense" } },
  "debit-notes": { module: "DEBIT_NOTES", label: { sq: "Shto debit note", en: "Add debit note" } },
  "worker-hours": { module: "WORKER_HOURS", label: { sq: "Shto Punëtor", en: "Add Worker" } },
  users: { module: "USERS", label: { sq: "Shto perdorues", en: "Add user" } },
};

export function AdminTopControls({
  locale,
  createModules,
}: {
  locale: Locale;
  createModules: PermissionModuleKey[];
}) {
  const pathname = usePathname() || "";
  const allowed = useMemo(() => new Set(createModules), [createModules]);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    return window.localStorage.getItem("admin-theme") === "light" ? "light" : "dark";
  });
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[2] ?? "";
  const target = createTargets[section];
  const showCreate = target && allowed.has(target.module) && segments[3] !== "new";

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.adminTheme = nextTheme;
    window.localStorage.setItem("admin-theme", nextTheme);
  }

  return (
    <>
      {showCreate ? (
        <Link href={`/${locale}/admin/${section}/new`} className={buttonClasses({ className: "gap-2" })}>
          <Plus className="h-4 w-4" />
          {target.label[locale]}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-[#2a241f] text-white/78 transition hover:bg-white/12 hover:text-white",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/18",
        )}
        aria-label={theme === "dark" ? (locale === "sq" ? "Kalo në dritë" : "Switch to light mode") : locale === "sq" ? "Kalo në errësirë" : "Switch to dark mode"}
        title={theme === "dark" ? (locale === "sq" ? "Dritë" : "Light") : locale === "sq" ? "Errësirë" : "Dark"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </>
  );
}
