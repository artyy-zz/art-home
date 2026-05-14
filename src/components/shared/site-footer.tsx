import Link from "next/link";
import { COMPANY } from "@/lib/company";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <footer className="border-t border-black/8 bg-[#1a1714] text-[#f2ede5]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] md:px-10 md:py-14">
        <div>
          <p className="font-display text-3xl">Art Home</p>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/72">
            {locale === "sq"
              ? "Mobilje me porosi për banesa, vila, hotele dhe ambiente biznesi me menaxhim të qartë nga oferta deri te fatura."
              : "Furniture for homes, villas, hotels, and commercial interiors with a disciplined process from quote to invoice."}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">
            {locale === "sq" ? "Navigim" : "Navigation"}
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <Link href={`/${locale}`}>{dict.nav.home}</Link>
            <Link href={`/${locale}/furniture`}>{dict.nav.furniture}</Link>
            <Link href={`/${locale}/about`}>{dict.nav.about}</Link>
            <Link href={`/${locale}/contact`}>{dict.nav.contact}</Link>
            <Link href={`/${locale}/quote`}>{dict.common.requestQuote}</Link>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">
            {locale === "sq" ? "Kontakt" : "Contact"}
          </p>
          <div className="mt-4 space-y-3 break-words text-sm text-white/80">
            <p>{COMPANY.phone}</p>
            <p>{COMPANY.email}</p>
            <p>{COMPANY.address}</p>
            <a href={COMPANY.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href={COMPANY.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
