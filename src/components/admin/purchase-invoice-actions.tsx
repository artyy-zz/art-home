"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import {
  deletePurchaseInvoiceAction,
  updatePurchaseInvoiceAction,
} from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";
import { formatDateInputValue } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

const statusLabels = {
  sq: {
    UNPAID: "E papaguar",
    PARTIAL: "Pjeserisht",
    PAID: "E paguar",
    OVERDUE: "E vonuar",
  },
  en: {
    UNPAID: "Unpaid",
    PARTIAL: "Partial",
    PAID: "Paid",
    OVERDUE: "Overdue",
  },
} as const;

type PurchaseInvoiceStatusKey = keyof typeof statusLabels.sq;

type PurchaseInvoiceActionsProps = {
  locale: Locale;
  invoice: {
    id: string;
    number: string;
    status: PurchaseInvoiceStatusKey;
    dueDate: Date;
    amountPaidCents: number;
    vatEnabled: boolean;
    notes: string | null;
  };
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
};

export function PurchaseInvoiceActions({
  locale,
  invoice,
  canEdit,
  canDelete,
  canExport,
}: PurchaseInvoiceActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {canExport ? (
          <Link
            href={`/api/purchase-invoices/${invoice.id}/pdf`}
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
          <form action={deletePurchaseInvoiceAction.bind(null, locale, invoice.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish faturen "${invoice.number}"?`
                  : `Are you sure you want to delete invoice "${invoice.number}"?`
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
                  {locale === "sq" ? "Ndrysho faturen e blerjes" : "Edit purchase invoice"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{invoice.number}</p>
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
              action={updatePurchaseInvoiceAction.bind(null, locale, invoice.id)}
              onSubmit={() => setIsOpen(false)}
              className="mt-5 grid gap-3"
            >
              <select name="status" defaultValue={invoice.status} className={inputClassName}>
                <option value="UNPAID">{statusLabels[locale].UNPAID}</option>
                <option value="PARTIAL">{statusLabels[locale].PARTIAL}</option>
                <option value="PAID">{statusLabels[locale].PAID}</option>
                <option value="OVERDUE">{statusLabels[locale].OVERDUE}</option>
              </select>
              <input
                name="dueDate"
                type="date"
                defaultValue={formatDateInputValue(invoice.dueDate)}
                className={inputClassName}
              />
              <input
                name="amountPaid"
                type="number"
                min="0"
                step="0.01"
                defaultValue={invoice.amountPaidCents / 100}
                className={inputClassName}
                placeholder={locale === "sq" ? "Paguar EUR" : "Paid EUR"}
              />
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-muted)]">
                <input type="checkbox" name="vatEnabled" defaultChecked={invoice.vatEnabled} className="h-4 w-4" />
                {locale === "sq" ? "Apliko TVSH" : "Apply VAT"} (18%)
              </label>
              <textarea
                name="notes"
                defaultValue={invoice.notes ?? ""}
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
