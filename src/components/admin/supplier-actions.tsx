"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { deleteSupplierAction, updateSupplierAction } from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";
const fieldLabelClassName =
  "grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]";

type SupplierActionsProps = {
  locale: Locale;
  supplier: {
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

export function SupplierActions({
  locale,
  supplier,
  canEdit,
  canDelete,
}: SupplierActionsProps) {
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
          <form action={deleteSupplierAction.bind(null, locale, supplier.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish furnitorin "${supplier.name}"?`
                  : `Are you sure you want to delete supplier "${supplier.name}"?`
              }
            />
          </form>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-black/10 bg-[#fbf8f4] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
                  {locale === "sq" ? "Ndrysho furnitorin" : "Edit supplier"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{supplier.name}</p>
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
              action={updateSupplierAction.bind(null, locale, supplier.id)}
              onSubmit={() => setIsOpen(false)}
              className="mt-5 grid gap-3 md:grid-cols-2"
            >
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Emri i furnitorit" : "Supplier name"}
                <input name="name" required defaultValue={supplier.name} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Personi kontaktues" : "Contact person"}
                <input
                  name="contactPerson"
                  defaultValue={supplier.contactPerson ?? ""}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                NUI
                <input name="nui" defaultValue={supplier.nui ?? ""} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                Email
                <input name="email" defaultValue={supplier.email ?? ""} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Telefoni" : "Phone"}
                <input name="phone" defaultValue={supplier.phone ?? ""} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Numri i TVSH" : "VAT number"}
                <input name="vatNumber" defaultValue={supplier.vatNumber ?? ""} className={inputClassName} />
              </label>
              <label className={`${fieldLabelClassName} md:col-span-2`}>
                {locale === "sq" ? "Adresa" : "Address"}
                <input name="address" defaultValue={supplier.address ?? ""} className={inputClassName} />
              </label>
              <label className={`${fieldLabelClassName} md:col-span-2`}>
                {locale === "sq" ? "Shenime" : "Notes"}
                <textarea name="notes" defaultValue={supplier.notes ?? ""} className={inputClassName} />
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
