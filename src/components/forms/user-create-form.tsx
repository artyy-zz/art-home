"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { PermissionChecklist } from "@/components/admin/permission-checklist";
import { useCreateFormPanel, useFinishCreateForm } from "@/components/admin/create-form-panel";
import { PasswordInput } from "@/components/forms/password-input";
import { buttonClasses } from "@/components/shared/button";
import type { Locale } from "@/lib/i18n";
import { createEmptyPermissionMatrix } from "@/lib/permissions-config";

type FormAction = (formData: FormData) => void | Promise<void>;

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

function UserCreateSubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className={buttonClasses({ className: "disabled:cursor-wait disabled:opacity-65" })}>
      {pending ? "..." : locale === "sq" ? "Ruaj perdoruesin" : "Save user"}
    </button>
  );
}

export function UserCreateForm({
  locale,
  action,
}: {
  locale: Locale;
  action: FormAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const finishCreateForm = useFinishCreateForm();
  const [error, setError] = useState("");
  const emptyPermissionMatrix = createEmptyPermissionMatrix();

  async function handleSubmit(formData: FormData) {
    setError("");

    try {
      await action(formData);
      formRef.current?.reset();
      finishCreateForm();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : locale === "sq"
            ? "Nuk u ruajt perdoruesi."
            : "User could not be saved.",
      );
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-4 md:grid-cols-3">
      <input name="name" required className={inputClassName} placeholder={locale === "sq" ? "Emri" : "Name"} />
      <input name="email" required type="email" className={inputClassName} placeholder="Email" />
      <PasswordInput className={inputClassName} placeholder={locale === "sq" ? "Fjalekalimi" : "Password"} buttonClassName="hover:bg-black/5" />
      <div className="md:col-span-3">
        <p className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">
          {locale === "sq" ? "Lejet e perdoruesit" : "User permissions"}
        </p>
        <PermissionChecklist locale={locale} matrix={emptyPermissionMatrix} />
      </div>
      {error ? (
        <p className="rounded-2xl bg-[rgba(140,47,43,0.09)] px-4 py-3 text-sm text-[var(--color-danger)] md:col-span-3">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 md:col-span-3">
        {closeCreateFormPanel ? (
          <button
            type="button"
            onClick={closeCreateFormPanel}
            className={buttonClasses({ variant: "secondary" })}
          >
            {locale === "sq" ? "Anulo" : "Cancel"}
          </button>
        ) : null}
        <UserCreateSubmitButton locale={locale} />
      </div>
    </form>
  );
}
