"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { deleteClientAction, updateClientAction } from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";
const fieldLabelClassName =
  "grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]";

type ClientActionsProps = {
  locale: Locale;
  client: {
    id: string;
    name: string;
    contactPerson: string | null;
    nui: string | null;
    vatNumber: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
  };
  canEdit: boolean;
  canDelete: boolean;
};

export function ClientActions({
  locale,
  client,
  canEdit,
  canDelete,
}: ClientActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {canEdit ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {locale === "sq" ? "Ndrysho" : "Edit"}
          </button>
        ) : null}
        {canDelete ? (
          <form action={deleteClientAction.bind(null, locale, client.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish klientin "${client.name}"?`
                  : `Are you sure you want to delete client "${client.name}"?`
              }
            />
          </form>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 py-3 sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-black/10 bg-[#fbf8f4] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
                  {locale === "sq" ? "Ndrysho klientin" : "Edit client"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{client.name}</p>
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

            <form
              action={updateClientAction.bind(null, locale, client.id)}
              onSubmit={() => setIsOpen(false)}
              className="mt-5 grid gap-3 md:grid-cols-2"
            >
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Emri i klientit" : "Client name"}
                <input name="name" required defaultValue={client.name} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Personi kontaktues" : "Contact person"}
                <input
                  name="contactPerson"
                  defaultValue={client.contactPerson ?? ""}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                NUI
                <input name="nui" defaultValue={client.nui ?? ""} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                Email
                <input name="email" defaultValue={client.email ?? ""} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Telefoni" : "Phone"}
                <input name="phone" defaultValue={client.phone ?? ""} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Numri i TVSH" : "VAT number"}
                <input name="vatNumber" defaultValue={client.vatNumber ?? ""} className={inputClassName} />
              </label>
              <label className={`${fieldLabelClassName} md:col-span-2`}>
                {locale === "sq" ? "Adresa" : "Address"}
                <input name="address" defaultValue={client.address ?? ""} className={inputClassName} />
              </label>
              <label className={`${fieldLabelClassName} md:col-span-2`}>
                {locale === "sq" ? "Shenime" : "Notes"}
                <textarea name="notes" defaultValue={client.notes ?? ""} className={inputClassName} />
              </label>
              <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
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
