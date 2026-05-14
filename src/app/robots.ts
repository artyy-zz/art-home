import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/sq/admin/", "/en/admin/", "/sq/login", "/en/login"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
