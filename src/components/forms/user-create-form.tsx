"use client";

import { useRef, useState } from "react";
import { useCreateFormPanel } from "@/components/admin/create-form-panel";
import { PasswordInput } from "@/components/forms/password-input";
import { buttonClasses } from "@/components/shared/button";
import type { Locale } from "@/lib/i18n";

type FormAction = (formData: FormData) => void | Promise<void>;

type RoleOption = {
  id: string;
  name: string;
  key: string | null;
};

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

export function UserCreateForm({
  locale,
  roles,
  action,
}: {
  locale: Locale;
  roles: RoleOption[];
  action: FormAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const [error, setError] = useState("");
  const defaultRoleId = roles.find((role) => role.key === "STAFF")?.id ?? "";

  async function handleSubmit(formData: FormData) {
    setError("");

    try {
      await action(formData);
      formRef.current?.reset();
      closeCreateFormPanel?.();
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
    <form ref={formRef} action={handleSubmit} className="grid gap-4 md:grid-cols-4">
      <input name="name" required className={inputClassName} placeholder={locale === "sq" ? "Emri" : "Name"} />
      <input name="email" required type="email" className={inputClassName} placeholder="Email" />
      <PasswordInput className={inputClassName} placeholder={locale === "sq" ? "Fjalekalimi" : "Password"} buttonClassName="hover:bg-black/5" />
      <select name="roleId" defaultValue={defaultRoleId} required className={inputClassName}>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      {error ? (
        <p className="rounded-2xl bg-[rgba(140,47,43,0.09)] px-4 py-3 text-sm text-[var(--color-danger)] md:col-span-4">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 md:col-span-4">
        {closeCreateFormPanel ? (
          <button
            type="button"
            onClick={closeCreateFormPanel}
            className={buttonClasses({ variant: "secondary" })}
          >
            {locale === "sq" ? "Anulo" : "Cancel"}
          </button>
        ) : null}
        <button className={buttonClasses({})}>
          {locale === "sq" ? "Ruaj perdoruesin" : "Save user"}
        </button>
      </div>
    </form>
  );
}
