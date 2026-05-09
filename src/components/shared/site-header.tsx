import Link from "next/link";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo } from "@/components/shared/logo";
import { MobileSiteMenu } from "@/components/shared/mobile-site-menu";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const navItems = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/furniture`, label: dict.nav.furniture },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-black/6 bg-[rgba(251,248,244,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-10 md:py-4">
        <Logo href={`/${locale}`} />
        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-muted)] md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex md:gap-3">
          <LanguageSwitcher locale={locale} />
          <Link href={`/${locale}/login`} className="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-black/5">
            {dict.common.login}
          </Link>
        </div>
        <MobileSiteMenu locale={locale} navItems={navItems} loginLabel={dict.common.login} />
      </div>
    </header>
  );
}
