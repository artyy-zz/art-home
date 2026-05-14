import type { MetadataRoute } from "next";
import { siteName } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "Art Home KS",
    description:
      "Custom furniture, kitchens, wardrobes, and interior systems by Mobileria Art Home in Kosovo.",
    start_url: "/sq",
    scope: "/",
    display: "standalone",
    background_color: "#fbf8f4",
    theme_color: "#1a1714",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
