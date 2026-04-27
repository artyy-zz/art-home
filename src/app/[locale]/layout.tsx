import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return [{ locale: "sq" }, { locale: "en" }];
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return children;
}
