import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { locales, type Locale } from "@/lib/i18n";
import { productionSiteUrl } from "@/lib/site-url";

export const siteUrl = productionSiteUrl;
export const metadataBase = new URL(siteUrl);
export const siteName = "Mobileria Art Home";
export const socialPreviewPath = "/social-preview";

export const rootMetadata: Metadata = {
  metadataBase,
  applicationName: siteName,
  title: {
    default: "Mobileria Art Home | Custom Furniture Kosovo",
    template: "%s",
  },
  description:
    "Mobileria Art Home designs custom furniture, made-to-measure kitchens, wardrobes, and interior systems for homes and businesses in Kosovo.",
  keywords: [
    "Mobileria Art Home",
    "Art Home KS",
    "mobilje me porosi",
    "kuzhina me porosi",
    "mobileri Kosovë",
    "furniture Kosovo",
    "custom furniture Kosovo",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: COMPANY.documents.legalName,
  publisher: COMPANY.documents.legalName,
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Mobileria Art Home | Custom Furniture Kosovo",
    description:
      "Custom furniture, kitchens, wardrobes, and interior systems made by Art Home KS in Kosovo.",
    url: "/sq",
    siteName,
    locale: "sq_AL",
    alternateLocale: ["en_GB"],
    type: "website",
    images: [
      {
        url: socialPreviewPath,
        width: 1200,
        height: 630,
        alt: "Mobileria Art Home - custom furniture and kitchens in Kosovo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobileria Art Home | Custom Furniture Kosovo",
    description:
      "Custom furniture, kitchens, wardrobes, and interior systems made by Art Home KS in Kosovo.",
    images: [
      {
        url: socialPreviewPath,
        alt: "Mobileria Art Home - custom furniture and kitchens in Kosovo",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export type PublicPage = "home" | "about" | "furniture" | "contact" | "quote";

const routePaths = {
  home: "",
  about: "/about",
  furniture: "/furniture",
  contact: "/contact",
  quote: "/quote",
} as const satisfies Record<PublicPage, string>;

const baseKeywords = [
  "Mobileria Art Home",
  "Art Home KS",
  "mobilje me porosi",
  "kuzhina me porosi",
  "mobileri Kosovë",
  "furniture Kosovo",
  "custom furniture Kosovo",
];

const pageSeo = {
  sq: {
    home: {
      title: "Mobileria Art Home | Mobilje me porosi në Kosovë",
      description:
        "Mobileria Art Home në Kosovë projekton kuzhina me porosi, garderoba dhe mobilje moderne për shtëpi e biznese, me matje dhe punim profesional.",
      keywords: ["mobileri në Kosovë", "mobilje moderne Kosovë"],
    },
    about: {
      title: "Rreth Mobileria Art Home | Art Home KS",
      description:
        "Njihuni me Art Home KS, mobileri në Kosovë e fokusuar në dizajn modern, materiale cilësore dhe realizim të saktë të mobiljeve me porosi.",
      keywords: ["rreth Art Home KS", "punishte mobiljesh Kosovë"],
    },
    furniture: {
      title: "Mobilje dhe kuzhina me porosi | Art Home KS",
      description:
        "Shikoni mobilje me porosi nga Art Home KS: kuzhina, tavolina, garderoba dhe sisteme të personalizuara për hapësira banimi e biznesi.",
      keywords: ["kuzhina me porosi", "garderoba me porosi", "mobilje për shtëpi"],
    },
    contact: {
      title: "Kontakt | Mobileria Art Home Kosovë",
      description:
        "Kontaktoni Mobileria Art Home për mobilje me porosi, kuzhina dhe projekte interieri në Kosovë. Na shkruani, telefononi ose vizitoni lokacionin.",
      keywords: ["kontakt Mobileria Art Home", "Art Home Ferizaj Prishtinë"],
    },
    quote: {
      title: "Kërko ofertë për mobilje me porosi | Art Home KS",
      description:
        "Dërgoni kërkesën tuaj për mobilje ose kuzhina me porosi dhe ekipi i Art Home KS do ta shqyrtojë projektin për ofertë profesionale.",
      keywords: ["ofertë mobilje me porosi", "porosit mobilje Kosovë"],
    },
  },
  en: {
    home: {
      title: "Mobileria Art Home | Custom Furniture Kosovo",
      description:
        "Art Home KS designs custom furniture in Kosovo, including made-to-measure kitchens, wardrobes, tables, and business interiors with professional execution.",
      keywords: ["custom furniture Kosovo", "furniture Kosovo"],
    },
    about: {
      title: "About Mobileria Art Home | Art Home KS",
      description:
        "Meet Art Home KS, a Kosovo furniture company focused on modern design, quality materials, and precise execution for custom interior projects.",
      keywords: ["about Art Home KS", "Kosovo furniture workshop"],
    },
    furniture: {
      title: "Custom Kitchens and Furniture | Art Home KS",
      description:
        "Explore custom furniture by Art Home KS: kitchens, wardrobes, dining tables, and made-to-measure systems for homes and business interiors.",
      keywords: ["custom kitchens Kosovo", "made-to-measure furniture Kosovo"],
    },
    contact: {
      title: "Contact | Mobileria Art Home Kosovo",
      description:
        "Contact Mobileria Art Home for custom furniture, kitchens, and interior projects in Kosovo. Reach us by phone, email, social media, or location.",
      keywords: ["contact Mobileria Art Home", "Art Home Kosovo contact"],
    },
    quote: {
      title: "Request a Custom Furniture Quote | Art Home KS",
      description:
        "Send your custom furniture or kitchen request to Art Home KS and our team will review the project details for a professional quote.",
      keywords: ["custom furniture quote Kosovo", "order furniture Kosovo"],
    },
  },
} as const satisfies Record<
  Locale,
  Record<PublicPage, { title: string; description: string; keywords: readonly string[] }>
>;

export function getPublicRoutePath(page: PublicPage) {
  return routePaths[page];
}

export function getLocalizedPath(locale: Locale, page: PublicPage) {
  return `/${locale}${routePaths[page]}`;
}

export function getAbsoluteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}

export function getAlternateLanguages(page: PublicPage) {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, getLocalizedPath(locale, page)]),
  );

  return {
    ...languages,
    "x-default": getLocalizedPath("sq", page),
  };
}

function getOgLocale(locale: Locale) {
  return locale === "sq" ? "sq_AL" : "en_GB";
}

export function buildPageMetadata(locale: Locale, page: PublicPage): Metadata {
  const seo = pageSeo[locale][page];
  const path = getLocalizedPath(locale, page);
  const socialAlt =
    locale === "sq"
      ? "Mobileria Art Home - mobilje dhe kuzhina me porosi në Kosovë"
      : "Mobileria Art Home - custom furniture and kitchens in Kosovo";

  return {
    title: seo.title,
    description: seo.description,
    keywords: [...baseKeywords, ...seo.keywords],
    alternates: {
      canonical: path,
      languages: getAlternateLanguages(page),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: path,
      siteName,
      locale: getOgLocale(locale),
      alternateLocale: locales
        .filter((alternateLocale) => alternateLocale !== locale)
        .map(getOgLocale),
      type: "website",
      images: [
        {
          url: socialPreviewPath,
          width: 1200,
          height: 630,
          alt: socialAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [
        {
          url: socialPreviewPath,
          alt: socialAlt,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function buildLoginMetadata(locale: Locale): Metadata {
  const title = locale === "sq" ? "Hyr në ERP" : "ERP Login";
  const description =
    locale === "sq"
      ? "Qasje e mbrojtur për ekipin e Mobileria Art Home."
      : "Protected access for the Mobileria Art Home team.";

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/login`,
      languages: {
        sq: "/sq/login",
        en: "/en/login",
      },
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export function getStructuredData(locale: Locale) {
  const inLanguage = locale === "sq" ? "sq" : "en";
  const organizationId = `${siteUrl}/#organization`;
  const localBusinessId = `${siteUrl}/#localbusiness`;
  const websiteId = `${siteUrl}/#website`;
  const logoUrl = getAbsoluteUrl("/images/brand/logo.jpg");
  const imageUrl = getAbsoluteUrl("/images/mobiljet/mobilje-1.jpg");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        legalName: COMPANY.documents.legalName,
        alternateName: ["Art Home", "Art Home KS", "Mobileria Art Home KS"],
        url: siteUrl,
        logo: logoUrl,
        image: imageUrl,
        email: COMPANY.email,
        telephone: COMPANY.phone,
        sameAs: [COMPANY.instagram, COMPANY.facebook],
      },
      {
        "@type": ["LocalBusiness", "FurnitureStore"],
        "@id": localBusinessId,
        name: siteName,
        legalName: COMPANY.documents.legalName,
        alternateName: ["Art Home KS", "Mobileria Art Home"],
        url: siteUrl,
        image: imageUrl,
        logo: logoUrl,
        telephone: COMPANY.phone,
        email: COMPANY.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY.address,
          addressLocality: "Ferizaj",
          addressRegion: "Kosovë",
          addressCountry: "XK",
        },
        areaServed: [
          {
            "@type": "Country",
            name: "Kosovo",
          },
          {
            "@type": "AdministrativeArea",
            name: "Kosovë",
          },
        ],
        priceRange: "$$",
        sameAs: [COMPANY.instagram, COMPANY.facebook],
        parentOrganization: {
          "@id": organizationId,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteName,
        alternateName: "Art Home KS",
        url: siteUrl,
        inLanguage,
        publisher: {
          "@id": organizationId,
        },
      },
    ],
  };
}
