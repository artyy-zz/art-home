import Link from "next/link";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo } from "@/components/shared/logo";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <header className="sticky top-0 z-30 border-b border-black/6 bg-[rgba(251,248,244,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-10">
        <Logo href={`/${locale}`} />
        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-muted)] md:flex">
          <Link href={`/${locale}`}>{dict.nav.home}</Link>
          <Link href={`/${locale}/furniture`}>{dict.nav.furniture}</Link>
          <Link href={`/${locale}/about`}>{dict.nav.about}</Link>
          <Link href={`/${locale}/contact`}>{dict.nav.contact}</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher locale={locale} />
          <Link href={`/${locale}/login`} className="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-black/5">
            {dict.common.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
