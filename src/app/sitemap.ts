import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import type { PublicPage } from "@/lib/seo";
import { getLocalizedPath, getPublicRoutePath } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

const publicPages: PublicPage[] = ["home", "about", "furniture", "quote", "contact"];

function absoluteUrl(path: string) {
  return `${siteUrl}${path}`;
}

function alternateLanguages(page: PublicPage) {
  return {
    sq: absoluteUrl(getLocalizedPath("sq", page)),
    en: absoluteUrl(getLocalizedPath("en", page)),
    "x-default": absoluteUrl(getLocalizedPath("sq", page)),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.flatMap((page) =>
    locales.map((locale) => ({
      url: absoluteUrl(getLocalizedPath(locale, page)),
      lastModified: new Date("2026-05-14"),
      changeFrequency: "monthly" as const,
      priority: getPublicRoutePath(page) === "" ? 1 : 0.8,
      alternates: {
        languages: alternateLanguages(page),
      },
    })),
  );
}
