import { dictionaries } from "@/data/dictionaries";

export const locales = ["sq", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "sq";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function pickLocale<T>(locale: Locale, sq: T, en: T) {
  return locale === "sq" ? sq : en;
}

export function localeToIntl(locale: Locale) {
  return locale === "sq" ? "sq-AL" : "en-GB";
}
