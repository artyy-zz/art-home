"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function swapLocale(pathname: string, target: Locale) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return `/${target}`;
  }

  if (locales.includes(segments[0] as Locale)) {
    segments[0] = target;
    return `/${segments.join("/")}`;
  }

  return `/${target}/${segments.join("/")}`;
}

export function LanguageSwitcher({
  locale,
  labels = "short",
  inverse = false,
}: {
  locale: Locale;
  labels?: "short" | "full";
  inverse?: boolean;
}) {
  const pathname = usePathname() || "/";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border p-1 text-xs font-semibold uppercase tracking-[0.16em]",
        inverse
          ? "border-white/14 bg-[#2a241f] text-white/78"
          : "border-black/12 bg-[#f8f1e8] text-[#3d332b]",
      )}
    >
      {locales.map((target) => {
        const href = swapLocale(pathname, target);
        const label =
          labels === "full" ? (target === "sq" ? "Shqip" : "English") : target === "sq" ? "AL" : "EN";

        return (
          <Link
            key={target}
            href={href}
            className={cn(
              "rounded-full px-3 py-2 transition",
              locale === target
                ? inverse
                  ? "bg-[#fff7eb] text-[#1e1a16]"
                  : "bg-[#1e1a16] text-[#fffaf2]"
                : inverse
                  ? "text-white/78 hover:bg-white/12 hover:text-white"
                  : "text-[#5a4b40] hover:bg-[#eadfce] hover:text-[#1e1a16]",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
