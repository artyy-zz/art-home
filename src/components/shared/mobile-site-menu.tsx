"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import type { Locale } from "@/lib/i18n";

type SiteNavItem = {
  href: string;
  label: string;
};

export function MobileSiteMenu({
  locale,
  navItems,
  loginLabel,
}: {
  locale: Locale;
  navItems: SiteNavItem[];
  loginLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/82 text-[var(--color-foreground)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(150,114,79,0.22)]"
        aria-label={locale === "sq" ? "Hap menune" : "Open menu"}
        aria-expanded={isOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-3">
          <div className="ml-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-sm flex-col overflow-y-auto rounded-[26px] border border-black/10 bg-[#fbf8f4] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-2xl leading-none tracking-[0.12em] text-[var(--color-foreground)]">
                Art Home
              </p>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/82 text-[var(--color-foreground)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(150,114,79,0.22)]"
                aria-label={locale === "sq" ? "Mbyll menune" : "Close menu"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-6 grid gap-2 text-base font-medium text-[var(--color-foreground)]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="rounded-2xl border border-black/8 bg-white/72 px-4 py-3 transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 grid gap-3 border-t border-black/10 pt-5">
              <LanguageSwitcher locale={locale} labels="full" />
              <Link
                href={`/${locale}/login`}
                onClick={close}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-foreground)] px-5 py-2.5 text-center text-sm font-medium !text-white transition hover:bg-black visited:!text-white"
              >
                {loginLabel}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
