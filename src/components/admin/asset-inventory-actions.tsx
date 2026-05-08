"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  deleteAssetInventoryAction,
  updateAssetInventoryAction,
} from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";

type AssetInventoryActionsProps = {
  locale: Locale;
  asset: {
    id: string;
    name: string;
    quantity: number;
    valueCents: number;
    purchaseDate: Date;
  };
  canEdit: boolean;
  canDelete: boolean;
};

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";
const fieldLabelClassName =
  "grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]";

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AssetInventoryActions({
  locale,
  asset,
  canEdit,
  canDelete,
}: AssetInventoryActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {canEdit ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}
          >
            <Pencil className="h-4 w-4" />
            {locale === "sq" ? "Ndrysho" : "Edit"}
          </button>
        ) : null}
        {canDelete ? (
          <form action={deleteAssetInventoryAction.bind(null, locale, asset.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              title={locale === "sq" ? "Konfirmo fshirjen" : "Confirm delete"}
              cancelLabel={locale === "sq" ? "Anulo" : "Cancel"}
              closeLabel={locale === "sq" ? "Mbyll" : "Close"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish aset-in "${asset.name}"?`
                  : `Are you sure you want to delete asset "${asset.name}"?`
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
                  {locale === "sq" ? "Ndrysho Inventarin" : "Edit Asset"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{asset.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-foreground)] transition hover:bg-white"
                aria-label={locale === "sq" ? "Mbyll" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={updateAssetInventoryAction.bind(null, locale, asset.id)}
              onSubmit={() => setIsOpen(false)}
              className="mt-5 grid gap-3 md:grid-cols-2"
            >
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Emri" : "Name"}
                <input
                  name="name"
                  required
                  defaultValue={asset.name}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Sasia" : "Quantity"}
                <input
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={asset.quantity}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Vlera" : "Value"}
                <input
                  name="value"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={asset.valueCents / 100}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Data kur është blerë" : "Purchase Date"}
                <input
                  name="purchaseDate"
                  type="date"
                  required
                  defaultValue={dateInputValue(asset.purchaseDate)}
                  className={inputClassName}
                />
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
                  {locale === "sq" ? "Ruaj" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
