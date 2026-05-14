import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

const publicRoutes = ["", "/about", "/furniture", "/quote", "/contact"] as const;

function absoluteUrl(path: string) {
  return `${siteUrl}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${route}`),
      lastModified: new Date("2026-05-14"),
      changeFrequency: "monthly" as const,
      priority: route === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alternateLocale) => [
            alternateLocale,
            absoluteUrl(`/${alternateLocale}${route}`),
          ]),
        ),
      },
    })),
  );
}
