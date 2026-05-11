"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { deleteMaterialAction, updateMaterialAction } from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";
import { centsToDecimalString } from "@/lib/money";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";
const fieldLabelClassName =
  "grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]";
const materialTypeOptions = [
  "WOOD",
  "HARDWARE",
  "COMPONENT",
  "FINISH",
  "ACCESSORY",
] as const;
const unitOptions = ["PCS", "SET", "METER", "SQM", "KG"] as const;

type MaterialTypeKey = (typeof materialTypeOptions)[number];

const materialTypeLabels: Record<MaterialTypeKey, Record<Locale, string>> = {
  WOOD: { sq: "Dru", en: "Wood" },
  HARDWARE: { sq: "Aksesorë", en: "Hardware" },
  COMPONENT: { sq: "Komponentë", en: "Components" },
  FINISH: { sq: "Finalizim", en: "Finishes" },
  ACCESSORY: { sq: "Shtesa", en: "Accessories" },
};

type InventoryActionsProps = {
  locale: Locale;
  material: {
    id: string;
    name: string;
    sku: string;
    type: MaterialTypeKey;
    unit: string;
    stockQuantity: number;
    lowStockThreshold: number;
    costPerUnitCents: number;
    notes: string | null;
  };
  canEdit: boolean;
  canDelete: boolean;
};

export function InventoryActions({
  locale,
  material,
  canEdit,
  canDelete,
}: InventoryActionsProps) {
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
          <form action={deleteMaterialAction.bind(null, locale, material.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish artikullin "${material.name}"?`
                  : `Are you sure you want to delete item "${material.name}"?`
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
                  {locale === "sq" ? "Ndrysho artikullin" : "Edit item"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{material.name}</p>
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
              action={updateMaterialAction.bind(null, locale, material.id)}
              onSubmit={() => setIsOpen(false)}
              className="mt-5 grid gap-3 md:grid-cols-2"
            >
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Emri" : "Name"}
                <input name="name" required defaultValue={material.name} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                SKU
                <input name="sku" required defaultValue={material.sku} className={inputClassName} />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Lloji" : "Type"}
                <select name="type" defaultValue={material.type} className={inputClassName}>
                  {materialTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {materialTypeLabels[type][locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Njësia" : "Unit"}
                <select name="unit" defaultValue={material.unit} className={inputClassName}>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Stoku" : "Stock"}
                <input
                  name="stockQuantity"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={material.stockQuantity}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Pragu" : "Threshold"}
                <input
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={material.lowStockThreshold}
                  className={inputClassName}
                />
              </label>
              <label className={fieldLabelClassName}>
                {locale === "sq" ? "Çmimi" : "Price"}
                <input
                  name="costPerUnit"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={centsToDecimalString(material.costPerUnitCents)}
                  className={inputClassName}
                />
              </label>
              <label className={`${fieldLabelClassName} md:col-span-2`}>
                {locale === "sq" ? "Shënime" : "Notes"}
                <textarea name="notes" defaultValue={material.notes ?? ""} className={inputClassName} />
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
