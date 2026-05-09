import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);

  return (
    <div className="min-h-[calc(100vh-3rem)] px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <Card tone="dark" className="rounded-[28px] p-5 sm:p-7 md:rounded-[36px] md:p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">
            {dict.login.demoLabel}
          </p>
          <h1 className="mt-4 break-words font-display text-4xl leading-none text-white sm:text-5xl">
            {dict.login.title}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-white/74">
            {dict.login.subtitle}
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_0.85fr]">
            <LoginForm locale={typedLocale} />
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-white/78">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                {typedLocale === "sq" ? "Panel i mbrojtur" : "Protected panel"}
              </p>
              <p className="mt-4 text-xs leading-6 text-white/55">
                {typedLocale === "sq"
                  ? "Ky panel është i rezervuar për menaxhimin e brendshëm të klientëve, inventarit, ofertave dhe faturave."
                  : "This panel is reserved for internal management of clients, inventory, offers, and invoices."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
