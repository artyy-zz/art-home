"use client";

import { useActionState } from "react";
import { createLeadAction } from "@/actions/public";
import type { ActionState } from "@/actions/auth";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const inputClassName =
  "w-full rounded-[22px] border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

export function QuoteForm({
  locale,
  successLabel,
}: {
  locale: Locale;
  successLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState | undefined, FormData>(
    createLeadAction.bind(null, locale),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-[var(--color-foreground)]">
            {locale === "sq" ? "Emri" : "Name"}
          </span>
          <input name="name" required className={inputClassName} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-[var(--color-foreground)]">
            {locale === "sq" ? "Telefoni" : "Phone"}
          </span>
          <input name="phone" required className={inputClassName} />
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-[var(--color-foreground)]">
          {locale === "sq" ? "Email" : "Email"}
        </span>
        <input type="email" name="email" required className={inputClassName} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-[var(--color-foreground)]">
          {locale === "sq" ? "Pershkrimi i kerkeses" : "Project brief"}
        </span>
        <textarea
          name="description"
          required
          rows={6}
          className={cn(inputClassName, "resize-none")}
          placeholder={
            locale === "sq"
              ? "P.sh. kuzhine me ishull 3.2m, dru lisi, fronta matte..."
              : "For example: 3.2m kitchen with island, oak fronts, matte finish..."
          }
        />
      </label>
      {state?.error ? (
        <p className="rounded-2xl bg-[rgba(140,47,43,0.09)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-2xl bg-[rgba(33,91,63,0.11)] px-4 py-3 text-sm text-[var(--color-success)]">
          {state.success || successLabel}
        </p>
      ) : null}
      <SubmitButton>{locale === "sq" ? "Dergo kerkesen" : "Send request"}</SubmitButton>
    </form>
  );
}
