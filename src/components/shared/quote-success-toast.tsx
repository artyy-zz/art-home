"use client";

import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

export function QuoteSuccessToast({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setVisible(false), 5200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex min-h-12 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-[rgba(33,91,63,0.24)] bg-[var(--color-success)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(33,91,63,0.28)]">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>{locale === "sq" ? "Oferta u dërgua" : "Quote request sent"}</span>
      </div>
    </div>
  );
}

export function QuoteSuccessToastFromQuery({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();

  if (searchParams.get("quote") !== "sent") {
    return null;
  }

  return <QuoteSuccessToast locale={locale} />;
}
