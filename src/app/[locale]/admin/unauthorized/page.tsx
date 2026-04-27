import Link from "next/link";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import { unauthorizedMessage } from "@/lib/permissions";

export default async function UnauthorizedPage({
  params,
}: PageProps<"/[locale]/admin/unauthorized">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  return (
    <Card className="rounded-[28px] p-8">
      <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
        {unauthorizedMessage(typedLocale)}
      </h2>
      <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
        {typedLocale === "sq"
          ? "Kontaktoni Owner / Super Admin për qasje shtesë."
          : "Contact the Owner / Super Admin for additional access."}
      </p>
      <Link href={`/${typedLocale}/admin`} className={buttonClasses({ className: "mt-6" })}>
        {typedLocale === "sq" ? "Kthehu në dashboard" : "Back to dashboard"}
      </Link>
    </Card>
  );
}
