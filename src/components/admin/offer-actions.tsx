"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import { deleteOfferAction, updateOfferStatusAction } from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";
import { formatDateInputValue } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

const statusLabels = {
  sq: {
    PENDING: "Ne pritje",
    ACCEPTED: "E pranuar",
    REJECTED: "E refuzuar",
  },
  en: {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
  },
} as const;

type OfferStatusKey = keyof typeof statusLabels.sq;

type OfferActionsProps = {
  locale: Locale;
  offer: {
    id: string;
    number: string;
    status: OfferStatusKey;
    validUntil: Date | null;
    createdAt: Date;
    vatEnabled: boolean;
    notes: string | null;
  };
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
};

export function OfferActions({
  locale,
  offer,
  canEdit,
  canDelete,
  canExport,
}: OfferActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {canExport ? (
          <Link
            href={`/api/offers/${offer.id}/pdf`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            PDF
          </Link>
        ) : null}
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
          <form action={deleteOfferAction.bind(null, locale, offer.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish oferten "${offer.number}"?`
                  : `Are you sure you want to delete offer "${offer.number}"?`
              }
            />
          </form>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 py-3 sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[24px] border border-black/10 bg-[#fbf8f4] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
                  {locale === "sq" ? "Ndrysho oferten" : "Edit offer"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{offer.number}</p>
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
              action={updateOfferStatusAction.bind(null, locale, offer.id)}
              onSubmit={() => setIsOpen(false)}
              className="mt-5 grid gap-3"
            >
              <select name="status" defaultValue={offer.status} className={inputClassName}>
                <option value="PENDING">{statusLabels[locale].PENDING}</option>
                <option value="ACCEPTED">{statusLabels[locale].ACCEPTED}</option>
                <option value="REJECTED">{statusLabels[locale].REJECTED}</option>
              </select>
              <input
                name="validUntil"
                type="date"
                defaultValue={formatDateInputValue(offer.validUntil ?? offer.createdAt)}
                className={inputClassName}
              />
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-muted)]">
                <input type="checkbox" name="vatEnabled" defaultChecked={offer.vatEnabled} className="h-4 w-4" />
                {locale === "sq" ? "Apliko TVSH" : "Apply VAT"} (18%)
              </label>
              <textarea
                name="notes"
                defaultValue={offer.notes ?? ""}
                className={inputClassName}
                placeholder={locale === "sq" ? "Shenime" : "Notes"}
              />
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
