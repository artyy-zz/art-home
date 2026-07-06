"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { deleteUserAction, updateUserCredentialsAction } from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";
const fieldLabelClassName =
  "grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]";

type UserActionsProps = {
  locale: Locale;
  user: {
    id: string;
    username: string;
    password: string | null;
  };
  canEditCredentials: boolean;
  canDelete: boolean;
  deleteMessageName: string;
};

export function UserActions({
  locale,
  user,
  canEditCredentials,
  canDelete,
  deleteMessageName,
}: UserActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(formData: FormData) {
    setError("");

    try {
      await updateUserCredentialsAction(locale, user.id, formData);
      setIsOpen(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : locale === "sq"
            ? "Perdoruesi nuk u ndryshua."
            : "User could not be updated.",
      );
    }
  }

  return (
    <>
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {canEditCredentials ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {locale === "sq" ? "Ndrysho" : "Edit"}
          </button>
        ) : null}
        {canDelete ? (
          <form action={deleteUserAction.bind(null, locale, user.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish perdoruesin "${deleteMessageName}"?`
                  : `Are you sure you want to delete user "${deleteMessageName}"?`
              }
            />
          </form>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 py-3 sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[24px] border border-black/10 bg-[#fbf8f4] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
                  {locale === "sq" ? "Ndrysho perdoruesin" : "Edit user"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{user.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-foreground)] transition hover:bg-white"
                aria-label={locale === "sq" ? "Mbyll" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={handleUpdate} className="mt-5 grid gap-3">
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Perdoruesi" : "Username"}
                <input
                  name="username"
                  required
                  autoComplete="username"
                  defaultValue={user.username}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Fjalekalimi" : "Password"}
                <input
                  name="password"
                  type="text"
                  autoComplete="new-password"
                  defaultValue={user.password ?? ""}
                  placeholder={
                    user.password
                      ? undefined
                      : locale === "sq"
                        ? "I ruajtur si hash; shkruaj fjalekalim te ri per ta ndryshuar"
                        : "Stored as a hash; enter a new password to change it"
                  }
                  className={inputClassName}
                />
              </label>
              {error ? (
                <p className="rounded-2xl bg-[rgba(140,47,43,0.09)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  {locale === "sq" ? "Anulo" : "Cancel"}
                </button>
                <button className={buttonClasses({ size: "sm" })}>
                  {locale === "sq" ? "Ndrysho" : "Edit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
