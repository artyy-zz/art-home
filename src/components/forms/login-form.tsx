"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/actions/auth";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";

const inputClassName =
  "w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-[rgba(255,255,255,0.28)] focus:ring-4 focus:ring-[rgba(255,255,255,0.08)]";

export function LoginForm({ locale }: { locale: Locale }) {
  const [state, formAction] = useActionState<ActionState | undefined, FormData>(
    loginAction.bind(null, locale),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="space-y-2 text-sm text-white/88">
        <span>{locale === "sq" ? "Email" : "Email"}</span>
        <input type="email" name="email" required className={inputClassName} />
      </label>
      <label className="space-y-2 text-sm text-white/88">
        <span>{locale === "sq" ? "Fjalëkalimi" : "Password"}</span>
        <PasswordInput className={inputClassName} buttonClassName="text-white" />
      </label>
      {state?.error ? (
        <p className="rounded-2xl bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[#f7c3c1]">
          {state.error}
        </p>
      ) : null}
      <SubmitButton variant="secondary">
        {locale === "sq" ? "Hyr në sistem" : "Access ERP"}
      </SubmitButton>
    </form>
  );
}
